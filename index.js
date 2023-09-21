const express = require('express')
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware
    
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next)=>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'});

  }
  //bearer token
  const token = authorization.split('')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next();

  })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xu7sm0d.mongodb.net/?retryWrites=true&w=majority`;

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

    const usersCollection = client.db("BistroDb").collection("users");
    const menuCollection = client.db("BistroDb").collection("menu");
    const reviewsCollection = client.db("BistroDb").collection("reviews");
    const cartCollection = client.db("BistroDb").collection("carts");
    
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })
    
    //Warning verify before verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    /* 
    * 1. use jwt token : verifyJWT
    * 2. 
    * 3. 
    * 4. 
    * 5.
    */

    //login 404 page redirection 
     app.get ('/users', verifyJWT,verifyAdmin, async(req, res) =>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    }) 

    //users related api

    app.post('/users', async(req, res ) => {
      const user = req.body;
      //console.log(user);
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query);
      console.log('existing user', existingUser)
      if(existingUser){
        return res.send({message: 'user already exits'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })


    app.get('/users/admin/:email', verifyJWT, async (req, res) =>{
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({admin: false})
      }
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result);
    })

    /* All Users part */

    app.patch('/users/admin/:id', async(req, res) =>{
      const id = req.params.id;
      console.log(id);
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          role: `admin`
        },
      };

      const result  = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    //review related api
    app.get('/menu', async(req, res) =>{
      
      const result = await menuCollection.find().toArray();
      res.send(result);
    })


    app.post('/menu', verifyJWT, verifyAdmin, async(req, res) =>{
      const newItem = req.body;
      const result = await menuCollection.insertOne(newItem);
      res.send(result);
    })

    //delete Api
    app.delete('/menu/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })

    // review related apis
    app.get('/reviews', async(req, res) =>{
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })

    //cart collection api
    app.get('/carts', verifyJWT, async(req, res) =>{
      const email = req.query.email;

      if(!email){
        res.send([]);
      }

       const decodedEmail = req.decoded.email;
       if(email !== decodedEmail){
        return res.status(403).send({error: true, message: 'forbidden access'})
       }

      const query = { email: email};
      const  result = await cartCollection.find(query).toArray();
      res.send(result);
    });  

    //cart api collection
    app.post('/carts', async(req, res) =>{
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/carts/:id', async(req, res)=>{
      const id = req.params.id;
      const query ={ _id: new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result);   
    })

    //create payment intent 
    app.post('/create-payment-intent', async(req, res) =>{
      const {price} = req.body;
      const amount = price *100;
      const paymentIntent = await stripe.paymentIntent.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Boss is sitting!')
})

app.listen(port, () => {
  console.log(`Bisto boss is setting ${port}`)
})