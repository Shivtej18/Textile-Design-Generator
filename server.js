require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const connectDB = require("./config/db");
const User = require("./models/User");
const Design = require("./models/Design");

// Connect to MongoDB
connectDB();

const app = express();

const PORT = process.env.PORT || 5000;
// const HOST = "0.0.0.0";

const JWT_SECRET =
  process.env.JWT_SECRET || "textile_secret_key";

const STABILITY_API_KEY =
  process.env.STABILITY_API_KEY;

// ================== MIDDLEWARE ==================

app.use(cors());

app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// ================== START LOG ==================

console.log("🎨 AI Textile Studio Starting...");

console.log(
  "🔑 Stability API Key:",
  STABILITY_API_KEY ? "Found ✅" : "Missing ❌"
);

// ================== AUTH ==================

// REGISTER

app.post(
  "/api/auth/register",

  async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: "All fields required" });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await User.create({ email, password: hashedPassword, name });

      const token = jwt.sign({ email, name }, JWT_SECRET, { expiresIn: "7d" });

      res.status(201).json({ token, user: { email, name } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// LOGIN

app.post(
  "/api/auth/login",

  async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token, user: { email: user.email, name: user.name } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ================== VERIFY TOKEN ==================

function verifyToken(req, res, next) {

  const authHeader =
    req.headers.authorization;

  if (!authHeader) {

    return res.status(401).json({
      error: "No token provided"
    });
  }

  const token =
    authHeader.split(" ")[1];

  try {

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      error: "Invalid token"
    });
  }
}

// ================== AI IMAGE GENERATION ==================

async function generateAIImage(
  prompt,
  region,
  patternType
) {

  const enhancedPrompt = `
    Indian textile fabric pattern,
    ${prompt},
    ${region} traditional style,
    ${patternType} design,
    intricate weaving,
    vibrant colors,
    realistic fabric texture,
    ultra detailed,
    professional quality,
    4k
  `;

  try {

    console.log(
      "🎨 Generating image..."
    );

    const formData =
      new FormData();

    formData.append(
      "prompt",
      enhancedPrompt
    );

    formData.append(
      "output_format",
      "png"
    );

    const response =
      await axios.post(

        "https://api.stability.ai/v2beta/stable-image/generate/core",

        formData,

        {

          headers: {

            Authorization:
              `Bearer ${STABILITY_API_KEY}`,

            Accept: "image/*",

            ...formData.getHeaders()
          },

          responseType: "arraybuffer",

          timeout: 60000
        }
      );

    const designsFolder =
      path.join(
        __dirname,
        "public",
        "designs"
      );

    if (
      !fs.existsSync(designsFolder)
    ) {

      fs.mkdirSync(
        designsFolder,
        {
          recursive: true
        }
      );
    }

    const fileName =
      `design_${Date.now()}.png`;

    const filePath =
      path.join(
        designsFolder,
        fileName
      );

    fs.writeFileSync(
      filePath,
      Buffer.from(response.data)
    );

    console.log(
      "✅ Image Saved:",
      fileName
    );

    return `/designs/${fileName}`;

  } catch (error) {

    console.log(
      "❌ Stability Error:"
    );

    console.log(
      error.response?.data?.toString()
      || error.message
    );

    throw new Error(
      "Image generation failed"
    );
  }
}

// ================== GENERATE DESIGN ==================

app.post(
  "/api/generate-design",

  verifyToken,

  async (req, res) => {
    try {
      const { prompt, region, patternType } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt required" });
      }

      const imageUrl = await generateAIImage(prompt, region, patternType);

      const design = await Design.create({
        prompt,
        region,
        patternType,
        imageUrl,
        userEmail: req.user.email
      });

      res.json({
        success: true,
        design: {
          id: design._id,
          prompt,
          region,
          patternType,
          imageUrl
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ================== GET USER DESIGNS ==================

app.get(
  "/api/designs",
  verifyToken,
  async (req, res) => {
    try {
      const userDesigns = await Design.find({ userEmail: req.user.email })
        .sort({ createdAt: -1 });
      res.json({ designs: userDesigns });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ================== DELETE DESIGN ==================

app.delete(
  "/api/designs/:id",
  verifyToken,
  async (req, res) => {
    try {
      const design = await Design.findById(req.params.id);
      if (!design) {
        return res.status(404).json({ error: "Design not found" });
      }
      if (design.userEmail !== req.user.email) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await Design.findByIdAndDelete(req.params.id);
      res.json({ message: "Design deleted" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ================== FRONTEND ==================

app.get("*", (req, res) => {

  res.sendFile(

    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

// ================== START SERVER ==================

app.listen(PORT, () => {

  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  );
});