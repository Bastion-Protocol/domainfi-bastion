import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: express.Application = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'valuation-api' });
});

app.get('/price/:token', (req, res) => {
  const { token } = req.params;
  // TODO: Implement price fetching logic
  res.json({ token, price: 0, timestamp: Date.now() });
});

app.listen(port, () => {
  console.log(`Valuation API running on port ${port}`);
});

export default app;
