export const healthCheck = async (req, res) => {
  try {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: "error" });
  }
};
 