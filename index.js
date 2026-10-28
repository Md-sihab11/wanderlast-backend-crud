import express from 'express'
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from 'cors';
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express()
const allowedOrigins = [
    'https://wanderlast-wine.vercel.app',
    'https://wanderlast-118ddopts-shakibs-projects-6a0fb07d.vercel.app',
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`CORS blocked origin: ${origin}`));
        },
    })
);

app.use(express.json());
const PORT = process.env.PORT;

const client = new MongoClient(process.env.URI);
export async function connectToMongoDB() {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
}

const mongoclient = await connectToMongoDB();
const db = mongoclient.db("wanderlast")
const destinationCollection = db.collection("detination")


const verify = (req, res, next) => {
    const authverify = req.headers.authorization
    // console.log(authverify)
    if (authverify !== "user logged in") {
        return res.status(404).send({ message: "Unauthorized!!" })
    }
    next();
}


app.get('/', (req, res) => {
    res.send(
        'WElcome to first api!!'
    )
})

app.post('/add-destination', async (req, res) => {
    const data = req.body
    const result = await destinationCollection.insertOne(data)
    console.log(result)
    res.send(result)
})

app.get('/destinations', verify, async (req, res) => {
    const result = await destinationCollection.find().toArray()
    res.send(result)
})

app.get('/destinations/:id', verify, async (req, res) => {

    const { id } = req.params
    const res1 = await destinationCollection.findOne({ _id: new ObjectId(id) })
    res.send({ res1 })
})

app.patch('/destinations/:id', async (req, res) => {
    const { id } = req.params
    const Update = req.body
    const res2 = await destinationCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: Update },
    )
    res.json(res2)
})

app.get('/stats', async (req, res) => {
    try {
        const destinations = await destinationCollection.find().toArray()
        const today = new Date().toISOString().slice(0, 10)

        const countries = new Set()
        let priceTotal = 0
        let priceCount = 0
        let upcomingDepartures = 0

        for (const destination of destinations) {
            if (destination.country) {
                countries.add(String(destination.country).trim().toLowerCase())
            }

            const price = Number(destination.price)
            if (Number.isFinite(price)) {
                priceTotal += price
                priceCount += 1
            }

            if (destination.departureDate && String(destination.departureDate) >= today) {
                upcomingDepartures += 1
            }
        }

        res.json({
            totalDestinations: destinations.length,
            countriesCovered: countries.size,
            upcomingDepartures,
            averagePrice: priceCount ? Math.round(priceTotal / priceCount) : 0,
        })
    } catch (err) {
        console.dir(err)
        res.status(500).json({ error: 'Failed to load stats' })
    }
})

app.delete('/destinations/:id', async (req, res) => {
    const { id } = req.params
    const res3 = await destinationCollection.deleteOne(
        { _id: new ObjectId(id) }
    )
    res.json(res3)
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});