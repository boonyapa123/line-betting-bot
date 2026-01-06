/**
 * Main Application Entry Point
 * LINE Betting Bot Application
 */

import express, { Express, Request, Response } from 'express';
import { config, validateConfig } from './config/environment';
import { connectDatabase, getDatabaseStatus } from './config/database';
import { verifyLineSignature } from './config/line';
import { LineMessageHandler } from './handlers/lineMessageHandler';
import { PostbackHandler } from './handlers/postbackHandler';
import { TextMessageHandler } from './handlers/textMessageHandler';
import { ErrorHandler } from './utils/errorHandler';
import { ChatTypeService } from './services/chatTypeService';
import paymentRoutes from './routes/paymentRoutes';

const app: Express = express();

/**
 * Middleware
 */

// Health check endpoint (before raw body parser)
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbStatus = getDatabaseStatus();
    const health = {
      status: dbStatus ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'connected' : 'disconnected',
    };

    res.status(dbStatus ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// LINE webhook - must use raw body
app.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    // Verify LINE signature
    const signature = req.headers['x-line-signature'] as string;
    const body = req.body;

    if (!signature) {
      console.warn('⚠️ Missing LINE signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

    if (!verifyLineSignature(bodyString, signature)) {
      console.warn('⚠️ Invalid LINE signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse body
    let parsedBody;
    if (Buffer.isBuffer(body)) {
      parsedBody = JSON.parse(body.toString());
    } else if (typeof body === 'string') {
      parsedBody = JSON.parse(body);
    } else {
      parsedBody = body;
    }

    // Respond immediately
    res.status(200).json({ ok: true });

    // Process events asynchronously
    if (parsedBody.events && Array.isArray(parsedBody.events)) {
      for (const event of parsedBody.events) {
        try {
          await handleLineEvent(event);
        } catch (error) {
          ErrorHandler.logError('Error processing LINE event', error, { event });
        }
      }
    }
  } catch (error) {
    ErrorHandler.logError('Error in webhook handler', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Support root path
app.post('/', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-line-signature'] as string;
    const body = req.body;

    if (!signature) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

    if (!verifyLineSignature(bodyString, signature)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let parsedBody;
    if (Buffer.isBuffer(body)) {
      parsedBody = JSON.parse(body.toString());
    } else if (typeof body === 'string') {
      parsedBody = JSON.parse(body);
    } else {
      parsedBody = body;
    }

    res.status(200).json({ ok: true });

    if (parsedBody.events && Array.isArray(parsedBody.events)) {
      for (const event of parsedBody.events) {
        try {
          await handleLineEvent(event);
        } catch (error) {
          ErrorHandler.logError('Error processing LINE event', error, { event });
        }
      }
    }
  } catch (error) {
    ErrorHandler.logError('Error in root webhook handler', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// JSON middleware for other routes
app.use(express.json());

// Serve static files (for LIFF)
app.use(express.static('public'));

// Payment routes
app.use('/api', paymentRoutes);

// Status endpoint
app.get('/status', async (_req: Request, res: Response) => {
  try {
    const dbStatus = getDatabaseStatus();
    res.json({
      status: 'running',
      database: dbStatus ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Logs endpoint
app.get('/logs', (_req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const logsDir = path.join(__dirname, '../logs');
    const logFile = path.join(logsDir, 'app.log');

    if (!fs.existsSync(logFile)) {
      return res.json({ logs: 'No logs found' });
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').slice(-100); // Last 100 lines

    res.json({
      logs: lines.join('\n'),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  ErrorHandler.logError('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

/**
 * Handle LINE event
 */
async function handleLineEvent(event: any): Promise<void> {
  try {
    // Handle postback events (Rich Menu buttons)
    if (event.type === 'postback') {
      console.log('📤 Processing postback event:', event.postbackData);
      await PostbackHandler.handle(event);
      return;
    }

    // Skip non-message events
    if (event.type !== 'message') {
      console.log('⏭️ Skipping non-message event:', event.type);
      return;
    }

    // Handle text messages (commands)
    if (event.message.type === 'text') {
      console.log('📝 Processing text message:', event.message.text);
      
      // Identify chat type
      const chatType = ChatTypeService.identifyChatType(event.source);
      console.log(`📍 Chat type: ${chatType}`);

      await TextMessageHandler.handle(event);
      return;
    }

    // Handle other message types
    await LineMessageHandler.handleMessage(event);
  } catch (error) {
    ErrorHandler.logError('Error handling LINE event', error, { event });
  }
}

/**
 * Initialize application
 */
export async function initializeApp(): Promise<Express> {
  try {
    console.log('🚀 Initializing LINE Betting Bot...');

    // Validate configuration
    if (!validateConfig()) {
      throw new Error('Invalid configuration');
    }

    // Connect to database
    const dbConnected = await connectDatabase();
    if (!dbConnected) {
      console.warn('⚠️ Database connection failed, continuing without database');
    }

    console.log('✅ Application initialized successfully');
    return app;
  } catch (error) {
    ErrorHandler.logError('Failed to initialize application', error);
    throw error;
  }
}

/**
 * Start server
 */
export async function startServer(): Promise<void> {
  try {
    const app = await initializeApp();
    const PORT = config.PORT;

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook`);
    });
  } catch (error) {
    ErrorHandler.logError('Failed to start server', error);
    process.exit(1);
  }
}

export default app;
