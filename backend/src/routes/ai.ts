import { Router } from 'express'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { chatWithAI } from '../services/ai.js'

const router = Router()

// All AI routes require authentication
router.use(authMiddleware)

router.post('/chat', async (req: AuthenticatedRequest, res) => {
    try {
        const { messages, model } = req.body
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ success: false, error: 'Messages array is required' })
        }

        const aiResponse = await chatWithAI(messages, model)
        res.json({ success: true, message: aiResponse })
    } catch (error: any) {
        console.error('[AI Route] Error:', error)
        res.status(500).json({ success: false, error: error.message || 'AI request failed' })
    }
})

router.post('/autocomplete', async (req: AuthenticatedRequest, res) => {
    try {
        const { prefix, suffix, filename } = req.body
        
        if (prefix === undefined || suffix === undefined) {
            return res.status(400).json({ success: false, error: 'Prefix and suffix are required' })
        }

        const { getAutocomplete } = await import('../services/ai.js')
        const suggestion = await getAutocomplete(prefix, suffix, filename || 'unknown')
        
        res.json({ success: true, suggestion })
    } catch (error: any) {
        console.error('[Autocomplete Route] Error:', error)
        res.status(500).json({ success: false, error: error.message || 'Autocomplete failed' })
    }
})

export default router
