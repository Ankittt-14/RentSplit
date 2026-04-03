require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const connectDB = require("./config/db");
const socketHandler = require("./socket/index");

// Initialize Apps
const app = express();
const server = http.createServer(app);

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/claims", require("./routes/claimRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/settlements", require("./routes/settlementRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// Initialize Socket.io
socketHandler(server);

// Basic route
app.get("/", (req, res) => {
  res.send("RentSplit API is running...");
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
