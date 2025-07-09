import express from 'express';

const router = express.Router();

// AI routes (future implementation)
router.post('/process', (req, res) => {
	res.json({
		message: 'AI processing endpoint - coming soon',
		status: 'not implemented'
	});
});

export default router; 