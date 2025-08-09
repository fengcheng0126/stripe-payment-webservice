const express = require("express");
const app = express();
const { resolve } = require("path");
const env = require("dotenv").config({ path: "./.env" });

const cors = require("cors");

console.log("Stripe Secret Key:", process.env.STRIPE_SECRET_KEY ? "Loaded" : "Missing");
console.log("Stripe Publishable Key:", process.env.STRIPE_PUBLISHABLE_KEY ? "Loaded" : "Missing");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-08-01",
});

// ✅ Parse incoming JSON request bodies
app.use(express.json());

app.use(cors({
  origin: "https://str333ak-pcs.web.app"
}));

// Serve static files (e.g. index.html)
// app.use(express.static(process.env.STATIC_DIR));

// app.get("/", (req, res) => {
//   const path = resolve(process.env.STATIC_DIR + "/index.html");
//   res.sendFile(path);
// });

app.get("/config", (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.post("/create-payment-intent", async (req, res) => {
  
  try {
    const { cart } = req.body; // cart = [{ id: "prod_XXXX" }, ...]

    let total = 0;

    for (const item of cart) {
      const product = await stripe.products.retrieve(item.id);
      const prices = await stripe.prices.list({ product: item.id, limit: 1 });
      console.log("Product:", product);

      if (!prices.data[0]) {
        return res.status(400).json({ error: `No price found for product ${item.id}` });
      }

      const unitAmount = prices.data[0].unit_amount; // in cents
      total += unitAmount;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Stripe error:", error.message);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
  console.log("Request body:", req.body);
});

const PORT = process.env.PORT || 5252;
app.listen(PORT, () => 
  console.log(`Node server listening at http://localhost:${PORT}`)
);