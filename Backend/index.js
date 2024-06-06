import express from "express";
import admin from "firebase-admin";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import axios from "axios";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp } from "@firebase/app";
import jwt from "jsonwebtoken";
import { createUserWithEmailAndPassword } from "firebase/auth";

const app = express();

app.use(cookieParser());

const firebaseConfig = {
  apiKey: "AIzaSyA0bp-cS9BQf7mpNzIXqbJYf7j9mdMNsNU",
  authDomain: "indio-branco.firebaseapp.com",
  databaseURL: "https://indio-branco-default-rtdb.firebaseio.com",
  projectId: "indio-branco",
  storageBucket: "indio-branco.appspot.com",
  messagingSenderId: "294743979152",
  appId: "1:294743979152:web:c5f93a5a623baf4ca6d415",
  measurementId: "G-8XXT3TBT8Y",
};
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

admin.initializeApp({
  credential: admin.credential.cert("serviceAccountKey.json"),
  databaseURL: "https://indio-branco-default-rtdb.firebaseio.com",
});

const db = admin.firestore();
const collectionRef = db.collection("produtos");
const collectionRefCarrinho = db.collection("carrinho");
const collectionUser = db.collection("users");

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ2TnhueTVudHpXWXRVQWhLRmZIQmxzR2IxS1QyIiwiaWF0IjoxNzE3NjI3MzM5fQ.N9J8DpowposP55m6dENW9sIANv_jEQbFyEZqAvMaO_k",
    resave: false,
    saveUninitialized: true
  })
);

app.post('/criarUsuario', async (req, res) => {
  try {
    const { email, senha, nome, uf, cidade } = req.body;

    console.log(email, senha, nome, uf, cidade)

    const credencialUsuario = await createUserWithEmailAndPassword(auth, email, senha);
    const uid = credencialUsuario.user.uid;

    await collectionUser.add({
      nome: nome,
      uf: uf,
      cidade: cidade
    })
    res.status(201).send("Usuário criado com sucesso!");

  } catch (erro) {
    console.error("Erro ao criar usuário:", erro);
    res.status(500).json({ sucesso: false, erro: "Não foi possível criar o usuário" });
  }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        const userDoc = await collectionUser.doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).send("Usuário não encontrado");
        }

        const token = jwt.sign({ uid: uid, email: userCredential.user.email }, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ2TnhueTVudHpXWXRVQWhLRmZIQmxzR2IxS1QyIiwiaWF0IjoxNzE3NjI3MzM5fQ.N9J8DpowposP55m6dENW9sIANv_jEQbFyEZqAvMaO_k', { expiresIn: '1h' });
        res.cookie('token', token, { maxAge: 3600000, httpOnly: true }); 
        res.cookie('token', token, { 
            maxAge: 3600000, 
            httpOnly: true, 
            domain: 'http://localhost:3000', 
            path: '/', 
          });
          const userData = {
            ...userDoc.data(),
            uid: uid,
            email: userCredential.user.email,
            token: token            
        };

        return res.json(userData);

    } catch (error) {
        return res.status(401).json({ message: 'Credenciais inválidas. Por favor, verifique seu e-mail e senha.' });
    }
});

app.post("/check-token", (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).send("Token não encontrado");
  }

  try {
    const decoded = jwt.verify(token, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJ2TnhueTVudHpXWXRVQWhLRmZIQmxzR2IxS1QyIiwiaWF0IjoxNzE3NjI3MzM5fQ.N9J8DpowposP55m6dENW9sIANv_jEQbFyEZqAvMaO_k");
    res.json({ message: "Token válido", user: decoded });
  } catch (error) {
    res.status(401).send("Token inválido ou expirado");
  }
});

app.get("/loadApiUF", async (req, res) => {
  try {
    const response = await axios.get("https://brasilapi.com.br/api/ibge/uf/v1");
    res.json(response.data);
  } catch (error) {
    res.send("Erro ao carregar dados.");
  }
});

app.get("/loadApiCity", async (req, res) => {
  const { uf } = req.query;
  try {
    const response = await axios.get(
      `https://brasilapi.com.br/api/ibge/municipios/v1/${uf}`
    );
    res.json(response.data);
  } catch (error) {
    res.send("Erro ao carregar dados.");
  }
});

app.get("/readProduct", (request, response) => {
  collectionRef
    .get()
    .then((snapshot) => {
      const transactions = snapshot.docs.map((doc) => ({
        ...doc.data(),
        uid: doc.id,
      }));
      response.json(transactions);
    })
    .catch((error) => {
      response.status(500).send("Erro ao buscar transações");
    });
});

app.get("/readCart", (request, response) => {
  collectionRefCarrinho
    .get()
    .then((snapshot) => {
      const transactions = snapshot.docs.map((doc) => ({
        ...doc.data(),
        uid: doc.id,
      }));
      response.json(transactions);
    })
    .catch((error) => {
      response.status(500).send("Erro ao buscar transações");
    });
});

app.get("/readProduct/:uid", (req, res) => {
  const uid = req.params.uid;
  collectionRef
    .doc(uid)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        res.status(404).send("Produto não encontrado.");
      } else {
        res.json({
          id: doc.id,
          ...doc.data(),
        });
      }
    })
    .catch((error) => {
      res.status(500).send("Erro ao buscar produto");
    });
});

app.post("/createProduct", (req, res) => {
  const { codigo, titulo, detalhes, imagem, preco, destaque } = req.body;

  collectionRef
    .add({
      codigo: codigo,
      titulo: titulo,
      detalhes: detalhes,
      imagem: imagem,
      preco: preco,
      destaque: destaque,
    })
    .then((docRef) => {
      res.status(201).send("Produto criado com sucesso!");
    })
    .catch((error) => {
      res.status(500).send("Erro ao criar produto");
    });
});

app.post("/adicionarCarrinho", (req, res) => {
  const { produto, quantidade, nome, preco } = req.body;

  collectionRefCarrinho
    .add({
      produto: produto,
      quantidade: quantidade,
      nome: nome,
      preco: preco,
    })
    .then((docRef) => {
      res.status(201).send("Adicionado ao carrinho:");
    })
    .catch((error) => {
      res.status(500).send("Erro ao adicionar produto");
    });
});

app.put("/updateProduct/:uid", (req, res) => {
  const uid = req.params.uid;
  const { codigo, titulo, detalhes, imagem, preco, destaque } = req.body;

  collectionRef
    .doc(uid)
    .update({
      codigo: codigo,
      titulo: titulo,
      detalhes: detalhes,
      imagem: imagem,
      preco: preco,
      destaque: destaque,
    })

    .then(() => {
      res.status(200).send("Produto atualizado com sucesso!");
    })
    .catch((error) => {
      res.status(500).send("Erro ao atualizar produto");
    });
});

app.put("/updateCarrinho/:uid", (req, res) => {
  const uid = req.params.uid;
  const { quantidade } = req.body;

  collectionRefCarrinho
    .doc(uid)
    .update({
      quantidade: quantidade,
    })

    .then(() => {
      res.status(200).send("Produto atualizado com sucesso!");
    })
    .catch((error) => {
      res.status(500).send("Erro ao atualizar produto");
    });
});

app.put("/alterarUser/:uid", (req, res) => {
  const uid = req.params.uid;
  const { nome } = req.body;

  collectionUser
    .doc(uid)
    .update({
      nome: nome,
    })

    .then(() => {
      res.status(200).send("Perfil atualizado com sucesso!");
    })
    .catch((error) => {
      res.status(500).send("Erro ao atualizar produto");
    });
});

app.delete("/deleteProduct/:uid", (req, res) => {
  const uid = req.params.uid;

  collectionRef
    .doc(uid)
    .delete()
    .then(() => {
      res.status(200).send("Produto excluído com sucesso!");
    })
    .catch((error) => {
      res.status(500).send("Erro ao excluir produto");
    });
});

app.delete("/deleteCarrinho/:uid", (req, res) => {
  const uid = req.params.uid;
  collectionRefCarrinho
    .doc(uid)
    .delete()
    .then(() => {
      res.status(200).send("Produto excluído com sucesso! Cart");
    })
    .catch((error) => {
      res.status(500).send("Erro ao excluir produto Cart");
    });
});

app.listen(8000, () => console.log("API iniciada em http://localhost:8000"));
