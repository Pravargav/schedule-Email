
// File: server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { Agenda } = require('agenda');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
const mongoConnectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/email-scheduler';
mongoose.connect(mongoConnectionString)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize Agenda
const agenda = new Agenda({ db: { address: mongoConnectionString, collection: 'jobs' } });

// Define Sequence Schema
const sequenceSchema = new mongoose.Schema({
  name: String,
  schedule: {
    monday: Boolean,
    tuesday: Boolean,
    wednesday: Boolean,
    thursday: Boolean,
    friday: Boolean,
    saturday: Boolean,
    sunday: Boolean
  },
  nodes: [Object],
  edges: [Object],
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Sequence = mongoose.model('Sequence', sequenceSchema);

// Nodemailer transporter setup
const setupTransporter = (fromEmail) => {
  // You would need to set up OAuth2 or Application Password for Gmail
  // For simplicity, we're using environment variables here
  let password;
  
  if (fromEmail === process.env.EMAIL_USER) {
    password = process.env.EMAIL_PASSWORD;
  } else if (fromEmail === process.env.EMAIL_USER2) {
    password = process.env.EMAIL_PASSWORD2;
  } else {
    throw new Error('Unknown email address');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: fromEmail,
      pass: password // This should be an app-specific password
    }
  });
};

// Define agenda job to process sequence nodes
agenda.define('process sequence node', async (job) => {
  const { sequenceId, nodeId, currentLeadSource } = job.attrs.data;
  
  try {
    const sequence = await Sequence.findById(sequenceId);
    if (!sequence || sequence.status !== 'active') {
      console.log(`Sequence ${sequenceId} not found or not active`);
      return;
    }
    
    const currentNode = sequence.nodes.find(node => node.id === nodeId);
    if (!currentNode) {
      console.log(`Node ${nodeId} not found in sequence ${sequenceId}`);
      return;
    }
    
    console.log(`Processing node: ${currentNode.id} of type: ${currentNode.type}`);
    
    // Get the edges to find the next node
    const nextEdge = sequence.edges.find(edge => edge.source === nodeId);
    const nextNodeId = nextEdge ? nextEdge.target : null;
    
    let newLeadSource = currentLeadSource;
    
    // Process node based on type
    switch (currentNode.type) {
      case 'leadSource':
        newLeadSource = currentNode.data.fromEmail;
        console.log(`New lead source: ${newLeadSource}`);
        // Schedule the next node immediately
        if (nextNodeId) {
          await scheduleNode(sequence._id, nextNodeId, newLeadSource);
        }
        break;
        
      case 'coldEmail':
        if (!newLeadSource) {
          console.log('No lead source available to send email');
          return;
        }
        
        // Send emails to all target emails
        const transporter = setupTransporter(newLeadSource);
        const { subject, body, targetEmails } = currentNode.data;
        
        if (!targetEmails || targetEmails.length === 0) {
          console.log('No target emails defined for this email node');
          return;
        }
        
        for (const email of targetEmails) {
          try {
            const mailOptions = {
              from: newLeadSource,
              to: email,
              subject: subject,
              text: body
            };
            
            const info = await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${email}: ${info.messageId}`);
          } catch (error) {
            console.error(`Failed to send email to ${email}:`, error);
          }
        }
        
        // Schedule the next node immediately
        if (nextNodeId) {
          await scheduleNode(sequence._id, nextNodeId, newLeadSource);
        }
        break;
        
      case 'waitDelay':
        const { duration, unit } = currentNode.data;
        let delayMs = 0;
        
        // Convert duration to milliseconds
        switch (unit.toLowerCase()) {
          case 'seconds':
            delayMs = duration * 1000;
            break;
          case 'minutes':
            delayMs = duration * 60 * 1000;
            break;
          case 'hours':
            delayMs = duration * 60 * 60 * 1000;
            break;
          case 'days':
            delayMs = duration * 24 * 60 * 60 * 1000;
            break;
          default:
            delayMs = duration * 60 * 1000; // default to minutes
        }
        
        console.log(`Waiting for ${duration} ${unit} (${delayMs}ms)`);
        
        // Schedule the next node after the delay
        if (nextNodeId) {
          await scheduleNode(sequence._id, nextNodeId, newLeadSource, delayMs);
        }
        break;
        
      default:
        console.log(`Unknown node type: ${currentNode.type}`);
    }
    
  } catch (error) {
    console.error('Error processing sequence node:', error);
  }
});

// Function to schedule a node for processing
async function scheduleNode(sequenceId, nodeId, leadSource, delay = 0) {
  const when = delay ? new Date(Date.now() + delay) : new Date();
  await agenda.schedule(when, 'process sequence node', {
    sequenceId,
    nodeId,
    currentLeadSource: leadSource
  });
  console.log(`Scheduled node ${nodeId} at ${when}`);
}

// API Routes
app.post('/api/sequences', async (req, res) => {
  try {
    const sequenceData = req.body;
    
    // Create new sequence in database
    const sequence = new Sequence(sequenceData);
    await sequence.save();
    
    // Find the first node (should be a lead source)
    const startNode = sequence.nodes.find(node => {
      // Find node that has no incoming edges
      return !sequence.edges.some(edge => edge.target === node.id);
    });
    
    if (!startNode) {
      return res.status(400).json({ error: 'Invalid sequence: No starting node found' });
    }
    
    // Schedule the first node to run immediately
    await scheduleNode(sequence._id, startNode.id, null);
    
    res.status(201).json({ 
      message: 'Sequence created and scheduled successfully', 
      sequence: sequence 
    });
  } catch (error) {
    console.error('Error creating sequence:', error);
    res.status(500).json({ error: 'Failed to create sequence' });
  }
});

app.get('/api/sequences', async (req, res) => {
  try {
    const sequences = await Sequence.find();
    res.json(sequences);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sequences' });
  }
});

app.get('/api/sequences/:id', async (req, res) => {
  try {
    const sequence = await Sequence.findById(req.params.id);
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }
    res.json(sequence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sequence' });
  }
});

app.put('/api/sequences/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const sequence = await Sequence.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }
    
    res.json(sequence);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update sequence status' });
  }
});

app.delete('/api/sequences/:id', async (req, res) => {
  try {
    const sequence = await Sequence.findByIdAndDelete(req.params.id);
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }
    
    // Cancel any pending jobs for this sequence
    await agenda.cancel({ 'data.sequenceId': req.params.id });
    
    res.json({ message: 'Sequence deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sequence' });
  }
});

// Start the server and agenda
(async function() {
  await agenda.start();
  console.log('Agenda started');
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await agenda.stop();
  process.exit(0);
});