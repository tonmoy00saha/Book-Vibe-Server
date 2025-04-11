const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();


app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.szqv4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const bookCollection = client.db("BookVibeDB").collection("Book");
    const cartsCollection = client.db("BookVibeDB").collection("Carts");
    const usersCollection = client.db("BookVibeDB").collection("Users");
    const ordersCollection = client.db("BookVibeDB").collection("Orders");

    // JWT realted API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1h'
      });
      res.send({ token });
    })


    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token ', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      })
    }
    // use verify admin after verify token
    const verifyAdmin = async(req, res, next)=>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role==='admin';
      if(!isAdmin){
        return res.status(403).send({message: 'Forbidded Access'});
      }
      next();
    }

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    })

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })
    app.get('/users/admin/:email', verifyToken, async(req,res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'Forbidden access'});
      }
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin' ;
      }
      res.send({admin});

    })
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existing_user = await usersCollection.findOne(query);
      if (existing_user) {
        return res.send({ message: 'User Already Exists' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.post('/orders', async(req,res)=>{
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    })
    app.get('/orders', verifyToken, verifyAdmin ,async(req,res)=>{
        const result = await ordersCollection.find().toArray();
        res.send(result);
    })
    app.patch('/orders/:id', async(req,res)=>{
      const id = req.params.id;
      const {role} = req.body;
      const query = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          status: role
        }
      }
      const result = await ordersCollection.updateOne(query, updateDoc);
      res.send(result);
    })

    app.get('/book', async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result);
    });
    app.get('/book/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await bookCollection.findOne(query);
      res.send(result);
    })

    app.post('/book',verifyToken, verifyAdmin, async(req,res)=>{
      const book = req.body;
      const result = await bookCollection.insertOne(book);
      res.send(book);
    });
    app.patch('/book/:id', async(req,res)=>{
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      console.log(item);
      const updateDoc = {
        $set:{
          bookName:item.bookName,
          author:item.authorName,
          review:item.review,
          totalPages: item.totalPages,
          rating: item.rating,
          category:item.category,
          tags: item.tags,
          publisher:item.publisher,
          yearOfPublishing:item.yearofpublishing,
          price: item.price,
        }
      }
      const result = await bookCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.delete('/book/:id',verifyToken,verifyAdmin ,async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await bookCollection.deleteOne(query);
      res.send(result);
    })
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    })
    app.delete('/carts/email/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await cartsCollection.deleteMany(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Vibe is creating');
})
app.listen(port, () => {
  console.log(`Vibe is opening ${port}`);
})