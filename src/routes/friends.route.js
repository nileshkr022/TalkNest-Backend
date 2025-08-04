import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectOrCancelFriendRequest,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  getFriends,
  removeFriend,
} from "../controllers/friends.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/send-request", authMiddleware, sendFriendRequest);
router.post("/accept", authMiddleware, acceptFriendRequest);
router.post("/remove", authMiddleware, removeFriend);
router.post("/reject", authMiddleware, rejectOrCancelFriendRequest);

router.get("/incoming", authMiddleware, getIncomingFriendRequests);
router.get("/outgoing", authMiddleware, getOutgoingFriendRequests);
router.get("/", authMiddleware, getFriends);

export default router;
