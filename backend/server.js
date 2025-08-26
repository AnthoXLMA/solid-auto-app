import express from "express";
import cors from "cors";
import { createPaymentIntent } from "./stripeService.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/create-payment", async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await createPaymentIntent(amount);
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Stripe server running on port ${PORT}`));
