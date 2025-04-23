// src/features/admin/admin.controller.ts
import { Router } from "express";
import { AdminManager } from "./admin.services";

const router = Router();
const adminManager = new AdminManager();

router.post('/admin/command', async (req, res) => {
  try {
    const { userPhone, message, sessionId } = req.body;
    const response = await adminManager.handleAdminCommand(userPhone, message, sessionId);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
});

export default router;