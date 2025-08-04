// friends.controller.js
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Send a Friend Request
export const sendFriendRequest = async (req, res) => {
  const sender = req.user._id;
  const { recipient } = req.body;

  if (sender.equals(recipient)) {
    return res.status(400).json({ message: "You cannot send a friend request to yourself!" });
  }

  // Optionally check for existing/pending requests
  const existing = await FriendRequest.findOne({
    sender,
    recipient,
    status: "pending"
  });

  if (existing) {
    return res.status(409).json({ message: "Friend request already sent." });
  }

  // Optionally check if already friends
  const alreadyFriends = await FriendRequest.findOne({
    $or: [
      { sender, recipient },
      { sender: recipient, recipient: sender }
    ],
    status: "accepted"
  });

  if (alreadyFriends) {
    return res.status(409).json({ message: "Already friends." });
  }

  const newRequest = new FriendRequest({ sender, recipient });
  await newRequest.save();
  res.status(201).json({ message: "Friend request sent." });
};

// Accept a Friend Request
export const acceptFriendRequest = async (req, res) => {
  const userId = req.user._id;
  const { requestId } = req.body;

  const request = await FriendRequest.findById(requestId);

  if (!request || !request.recipient.equals(userId)) {
    return res.status(404).json({ message: "Friend request not found." });
  }

  request.status = "accepted";
  await request.save();

  // Optionally add each user as friends in their User document (if you want to maintain a .friends array)
  await User.findByIdAndUpdate(userId, { $addToSet: { friends: request.sender } });
  await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: userId } });

  res.json({ message: "Friend request accepted." });
};

// Reject/Cancel Friend Request
export const rejectOrCancelFriendRequest = async (req, res) => {
  const userId = req.user._id;
  const { requestId } = req.body;
  const request = await FriendRequest.findById(requestId);

  if (!request) {
    return res.status(404).json({ message: "Friend request not found." });
  }

  // Allow only recipient (reject) or sender (cancel) to remove
  if (request.recipient.equals(userId) || request.sender.equals(userId)) {
    await request.deleteOne();
    return res.json({ message: "Friend request removed." });
  } else {
    return res.status(403).json({ message: "Not allowed." });
  }
};

// List Incoming Friend Requests
export const getIncomingFriendRequests = async (req, res) => {
  const userId = req.user._id;
  const requests = await FriendRequest.find({
    recipient: userId,
    status: "pending"
  }).populate("sender", "fullName profilePic");

  res.json(requests);
};

// List Outgoing Friend Requests
export const getOutgoingFriendRequests = async (req, res) => {
  const userId = req.user._id;
  const requests = await FriendRequest.find({
    sender: userId,
    status: "pending"
  }).populate("recipient", "fullName profilePic");

  res.json(requests);
};

// List/Search Friends (Accepted)
export const getFriends = async (req, res) => {
  const userId = req.user._id;
  const search = req.query.search?.toLowerCase() || "";
  const accepted = await FriendRequest.find({
    status: "accepted",
    $or: [{ sender: userId }, { recipient: userId }]
  }).populate("sender recipient", "fullName profilePic email");

  // Only get the "other" user for each friendship
  let friends = accepted.map(req =>
    req.sender._id.equals(userId) ? req.recipient : req.sender
  );

  if (search) {
    friends = friends.filter(friend =>
      (friend.fullName && friend.fullName.toLowerCase().includes(search)) ||
      (friend.email && friend.email.toLowerCase().includes(search))
    );
  }

  res.json(friends);
};

// (Optional) Remove a friend
export const removeFriend = async (req, res) => {
  const userId = req.user._id;
  const { friendId } = req.body;

  // Find the friendship
  const req1 = await FriendRequest.findOneAndDelete({
    $or: [
      { sender: userId, recipient: friendId },
      { sender: friendId, recipient: userId }
    ],
    status: "accepted"
  });

  // Also remove each other's IDs from .friends array if you are maintaining them
  await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
  await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

  res.json({ message: "Friend removed." });
};
