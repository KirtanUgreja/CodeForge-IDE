import { Router } from 'express'
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js'
import { createUserClient } from '../lib/supabase.js'
import nodemailer from 'nodemailer'

const router = Router()
router.use(authMiddleware)

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER || 'hrflow27@gmail.com',
        pass: process.env.SMTP_PASS || 'imht sjtz lseh zgra'
    }
})

// GET /api/collaborators/:projectId - List collaborators for a project
router.get('/:projectId', async (req: AuthenticatedRequest, res) => {
    try {
        const { projectId } = req.params
        const supabase = createUserClient(req.user!.accessToken)

        // Get project to verify ownership/access
        const { data: project } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single()

        if (!project) {
            return res.status(404).json({ error: 'Project not found' })
        }

        // Get collaborators with their user info
        const { data: collaborators, error } = await supabase
            .from('project_collaborators')
            .select('*')
            .eq('project_id', projectId)

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch collaborators' })
        }

        return res.json({ collaborators: collaborators || [] })
    } catch (error) {
        console.error('Error fetching collaborators:', error)
        return res.status(500).json({ error: 'Failed to fetch collaborators' })
    }
})

// POST /api/collaborators/:projectId/invite - Invite by email
router.post('/:projectId/invite', async (req: AuthenticatedRequest, res) => {
    try {
        const { projectId } = req.params
        const { email, githubUsername } = req.body

        if (!email && !githubUsername) {
            return res.status(400).json({ error: 'Email or GitHub username is required' })
        }

        const supabase = createUserClient(req.user!.accessToken)

        // Verify current user owns the project
        const { data: project } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single()

        if (!project) {
            return res.status(404).json({ error: 'Project not found' })
        }

        if (project.user_id !== req.user!.id) {
            return res.status(403).json({ error: 'Only the project owner can invite collaborators' })
        }

        // Build the IDE collaboration link
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000'
        const ideLink = `${frontendUrl}/ide/${projectId}`

        // Look up user by email in Supabase auth if possible
        // If the user exists, add them directly to collaborators
        const targetEmail = email || `${githubUsername}@users.noreply.github.com`

        // Send invitation email
        const mailOptions = {
            from: `"Code Forge Hub" <${process.env.SMTP_USER || 'hrflow27@gmail.com'}>`,
            to: targetEmail,
            subject: `🚀 You've been invited to collaborate on "${project.name}" - Code Forge Hub`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0D1117; color: #c9d1d9; border-radius: 16px; overflow: hidden; border: 1px solid #30363d;">
                    <div style="background: linear-gradient(135deg, #238636 0%, #1f6feb 100%); padding: 32px 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">⚡ Code Forge Hub</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Real-time Collaborative IDE</p>
                    </div>
                    <div style="padding: 32px 24px;">
                        <h2 style="color: #58a6ff; margin: 0 0 16px 0;">You've been invited to collaborate!</h2>
                        <p style="color: #8b949e; line-height: 1.6;">
                            You have been invited to join the project <strong style="color: #f0f6fc;">"${project.name}"</strong> 
                            on Code Forge Hub. Click the button below to open the IDE and start coding together in real-time!
                        </p>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${ideLink}" 
                               style="display: inline-block; background: linear-gradient(135deg, #238636 0%, #2ea043 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(35, 134, 54, 0.4);">
                                🔗 Join Workspace
                            </a>
                        </div>
                        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-top: 24px;">
                            <p style="color: #8b949e; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Direct Link</p>
                            <code style="color: #58a6ff; font-size: 13px; word-break: break-all;">${ideLink}</code>
                        </div>
                        ${githubUsername ? `<p style="color: #8b949e; margin-top: 16px; font-size: 13px;">GitHub: <strong style="color: #f0f6fc;">@${githubUsername}</strong></p>` : ''}
                    </div>
                    <div style="background: #161b22; border-top: 1px solid #30363d; padding: 16px 24px; text-align: center;">
                        <p style="color: #484f58; margin: 0; font-size: 12px;">Code Forge Hub — Real-time Collaborative IDE</p>
                    </div>
                </div>
            `
        }

        await transporter.sendMail(mailOptions)

        console.log(`[Collaborator] Invitation email sent to ${targetEmail} for project ${project.name}`)

        return res.json({
            success: true,
            message: `Invitation sent to ${targetEmail}`,
            ideLink
        })
    } catch (error: any) {
        console.error('Error sending invitation:', error)
        return res.status(500).json({ error: 'Failed to send invitation', details: error?.message })
    }
})

// DELETE /api/collaborators/:projectId/:userId - Remove a collaborator
router.delete('/:projectId/:userId', async (req: AuthenticatedRequest, res) => {
    try {
        const { projectId, userId } = req.params
        const supabase = createUserClient(req.user!.accessToken)

        const { error } = await supabase
            .from('project_collaborators')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', userId)

        if (error) {
            return res.status(500).json({ error: 'Failed to remove collaborator' })
        }

        return res.json({ success: true })
    } catch (error) {
        console.error('Error removing collaborator:', error)
        return res.status(500).json({ error: 'Failed to remove collaborator' })
    }
})

export default router
