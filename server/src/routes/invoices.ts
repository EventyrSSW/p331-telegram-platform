// server/src/routes/invoices.ts
import { Router } from 'express';
import { invoicesController } from '../controllers/invoicesController';
import { coinOperationLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/create', coinOperationLimiter, invoicesController.createInvoice);
router.post('/verify', coinOperationLimiter, invoicesController.verifyInvoice);
router.get('/me/stats', invoicesController.getUserInvoices);
router.get('/:invoiceId', invoicesController.getInvoiceStatus);
router.post('/:invoiceId/cancel', invoicesController.cancelInvoice);

export default router;
