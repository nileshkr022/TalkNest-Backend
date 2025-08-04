import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

export async function signup(req, res) {
  const { email, password, fullName } = req.body;

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists. Please log in." });
    }

    const randomAvatar = `https://image-cdn.flowgpt.com/trans-images/avatars/TKoS7Pw6ys93xili83OBb/1707260506506.webp`;

    // ✅ Create user
    const newUser = await User.create({
      email,
      fullName,
      password,
      profilePic: randomAvatar,
      bio: "",
      nativeLanguage: "",
      learningLanguage: "",
      location: "",
    });

    // ✅ Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    // ✅ Stream Chat User
    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: newUser.fullName,
        image: newUser.profilePic || "",
      });
      console.log(`✅ Stream user created for ${newUser.fullName}`);
    } catch (error) {
      console.log("⚠️ Error creating Stream user:", error.message);
    }

    // ✅ JWT Token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    // ✅ Cookie Settings (important for cross-domain Netlify + Render)
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true, // must be true in production with HTTPS
      sameSite: "none", // ✅ allow cross-site cookies
    });

    // ✅ Send Response
    res.status(201).json({ success: true, user: userResponse });
  } catch (error) {
    console.error("❌ Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({ success: true, user: userResponse });
  } catch (error) {
    console.log("❌ Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  res.clearCookie("jwt", { sameSite: "none", secure: true });
  res.status(200).json({ success: true, message: "Logout successful" });
}

export async function onboard(req, res) {
  try {
    const userId = req.user._id;
    const { fullName, bio, nativeLanguage, learningLanguage, location } = req.body;

    if (!fullName || !bio || !nativeLanguage || !learningLanguage || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fullName, bio, nativeLanguage, learningLanguage, location, isOnboarded: true },
      { new: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
    } catch (streamError) {
      console.log("⚠️ Stream update error:", streamError.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("❌ Onboarding error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
