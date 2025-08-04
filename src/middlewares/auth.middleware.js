import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  try {
    // ✅ Read JWT from cookies
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    // ✅ Fetch user
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    // ✅ Attach user to request for next handlers
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Error in authMiddleware:", error.message);

    // ✅ Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
};
