require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8kdu5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("luxewayDb");
    const roomsCollection = database.collection("rooms");
    const bookingsCollection = database.collection("bookings");
    const reviewsCollection = database.collection("reviews");

    // rooms apis
    app.get("/rooms", async (req, res) => {
      const result = await roomsCollection.find().toArray();
      res.send(result);
    });

    app.get("/room/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    // bookings apis
    app.post("/book-room", async (req, res) => {
      try {
        const { roomId, email, name, pricePerNight, image, selectedDate } =
          req.body;

        const room = await roomsCollection.findOne({
          _id: new ObjectId(roomId),
        });

        if (!room || !room.isAvailable) {
          return res
            .status(400)
            .send({ message: "Sorry, this room is no longer available." });
        }

        const booking = {
          roomId,
          email,
          name,
          pricePerNight,
          image,
          selectedDate,
          status: "booked",
        };

        await bookingsCollection.insertOne(booking);

        await roomsCollection.updateOne(
          { _id: new ObjectId(roomId) },
          { $set: { isAvailable: false } }
        );

        res.status(200).send({ message: "Room booked successfully!" });
      } catch (error) {
        console.error("Error booking the room:", error);
        res
          .status(500)
          .send({ message: "There was an error processing your booking." });
      }
    });

    app.get("/my-bookings/:email", async (req, res) => {
      const email = req.params.email;
      const result = await bookingsCollection.find({ email }).toArray();
      res.send(result);
    });

    // Cancel a booking
  app.delete("/cancel-booking/:id", async (req, res) => {
    const id = req.params.id;

    // Find booking and update room availability
    const booking = await bookingsCollection.findOne({
      _id: new ObjectId(id),
    });
    if (booking) {
      await roomsCollection.updateOne(
        { _id: new ObjectId(booking.roomId) },
        { $set: { isAvailable: true } }
      );
    }

    // Delete booking
    const result = await bookingsCollection.deleteOne({
      _id: new ObjectId(id),
    });
    res.send(result);
  });

  // Update booking date
  app.patch("/update-booking/:id", async (req, res) => {
    const id = req.params.id;
    const { selectedDate } = req.body;

    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { selectedDate } }
    );

    res.send(result);
  });

  // Post a review
  app.post("/reviews", async (req, res) => {
    const { roomId, username, rating, comment, timestamp, userPhoto } = req.body;

    const review = {
      roomId,
      username,
      userPhoto,
      rating,
      comment,
      timestamp,
    };

    const result = await reviewsCollection.insertOne(review);
    res.send(result);
  });

  // Get all reviews
  app.get("/reviews", async (req, res) => {
    try {
      const result = await reviewsCollection
        .find()
        .sort({ timestamp: -1 })
        .toArray();
      res.send(result);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).send({ message: "Error fetching reviews" });
    }
  });

  // Get reviews for a specific room
  app.get("/reviews/:roomId", async (req, res) => {
    const roomId = req.params.roomId;
    const result = await reviewsCollection.find({ roomId }).toArray();
    res.send(result);
  });

    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("LuxeWay server is running....");
});

app.listen(port, () => {
  console.log(`LuxeWay server is running on port: ${port}`);
});
