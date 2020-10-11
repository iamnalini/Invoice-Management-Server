var express = require('express');
var bodyParser = require('body-parser');
const {Client} = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const ejs = require('ejs');
var app = express();
const port = process.env.PORT || 5000;
app.use(cors());

const SECRET_KEY = "secretkey23456";

app.set('view engine', 'ejs');

//const connectionString = 'postgressql://postgres:nalini@localhost:5432/invoice';
const connectionString = 'postgres://kkxywgor:ANWDPgNSdJxMUAqwZXvkEh64OnxAnE25@drona.db.elephantsql.com:5432/kkxywgor';
const client = new Client({
    connectionString: connectionString
});

client.connect();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.post('/login', (req,response) => {
    client.query(`SELECT * FROM login where email=$1 and password=$2`,[req.body.email,req.body.password],(err,res) => {
        if(res.rowCount == 1){
            const expiresIn = 24 * 60 * 60;
            var row;
            row = res.rows[0];
            const accessToken = jwt.sign({ id: row.user_id }, SECRET_KEY, {
                expiresIn: expiresIn
            });
            response.send({"id":row.user_id, "role":row.role, "access_token": accessToken, "expires_in":expiresIn});
        }
        else{
            response.send({"Warning": "Invalid Email ID and Password"});
        }
    });
    
});

app.post('/register', (req, response) => {
    const  role  =  req.body.role;
    const  email  =  req.body.email;
    const  pwd  =  req.body.password;
    const username = req.body.userName;

    client.query(`SELECT email FROM login where email=$1`,[email],(error,resp) => {
        if(error){
            console.log(error)
        }
        else{
            if(resp.rowCount!=0){
                response.send({"Warning": "Email ID already Exists"});
            }
            else {
                client.query(`SELECT user_id FROM login order by user_id desc limit 1`,(err,res) => {
                    if(err) console.log(err)
                    var id;
                    if(res.rowCount==0)
                        id = 1;
                    else
                        id = (res.rows[0].user_id)+1;
                    client.query(`INSERT INTO login (user_id,username,email,password,role) values ($1,$2,$3,$4,$5)`,[id,username,email,pwd,role],(err,res) => {
                        if(err) console.log(err)
                        client.query(`SELECT * FROM login where email=$1`,[email],(err,res) => {
                            if (err) console.log(err)
                            else
                            {
                                const expiresIn = 24 * 60 * 60;
                                const accessToken = jwt.sign({ id: res.rows.user_id }, SECRET_KEY, {
                                    expiresIn: expiresIn
                                });
                                response.send({"id":res.rows.user_id, "access_token": accessToken, "expires_in":expiresIn});
                            }
                        });
                    });
                });
            }
        }
    })
});

app.post('/userview', (req,response) => {
    client.query(`SELECT invoice_id,invoice_name,date,amount FROM invoice_data where user_id=$1`,[req.body.user_id],(err,res) => {
        if(err)
            console.log(err)
        else
            response.send(res.rows);
    });
});

app.get('/adminview', (req,response) => {
    client.query(`SELECT invoice_id,username,invoice_name,date,amount FROM invoice_data`,(err,res) => {
        if(err)
            console.log(err)
        else
            response.send(res.rows);
    });
});

app.post('/create',(req,response) => {
    client.query(`SELECT invoice_id FROM invoice_data order by invoice_id desc limit 1`,(err,res) => {
        if(err)
            console.log(err);
        if(res.rowCount==0)
            var invoiceid = 1;
        else
            var invoiceid = (res.rows[0].invoice_id)+1;
        client.query(`SELECT username FROM login where user_id=$1`,[req.body.user_id],(err,res) => {
            if(err)
                console.log(err);
            else
            {
                let username = res.rows[0].username;
                client.query(`INSERT INTO invoice_data (invoice_id,user_id,username,invoice_name,amount) values ($1,$2,$3,$4,$5)`,[invoiceid,req.body.user_id,username,req.body.invoicename,req.body.amount],(err,resp) => {
                    if(err)
                        console.log(err);
                    response.send({'Response':'Created'});
                });
            }
        });
    });
   
});

app.post('/edit',(req,response) => {
    client.query(`Select username from login where user_id=$1`,[req.body.user_id],(err,res)=>{
        if(err)
            console.log(err)
        else{
            let username = res.rows[0].username;
            client.query(`DELETE FROM invoice_data where invoice_id=${req.body.invoiceid}`,(err,res) => {
                if(err)
                    console.log(err);
                client.query(`INSERT INTO invoice_data (invoice_id,user_id,username,invoice_name,amount) values ($1,$2,$3,$4,$5)`,[req.body.invoiceid,req.body.user_id,username,req.body.invoicename,req.body.amount],(err,resp) => {
                    if(err)
                        console.log(err);
                    response.send({'Response':'Edited'});
                }); 
            });
        }
    })
})

app.post('/delete',(req,response) => {
    client.query(`DELETE FROM invoice_data where invoice_id=${req.body.invoice_id}`,(err,res) => {
        if(err)
            console.log(err);
        response.send({'Response':'Deleted'})
    });
});

app.get('/admingraph',(req,response) => {
    client.query(`SELECT count(invoice_id) as y,date as label from invoice_data group by date`,(err,res) => {
        if(err)
            console.log(err)
        else{
            response.send(res.rows);
        }
    })
})

app.get('/admingraph1',(req,response) => {
    client.query(`SELECT count(invoice_id) as y,username as label from invoice_data group by user_id,username`,(err,res) => {
        if(err)
            console.log(err)
        else{
            response.send(res.rows)
        }
    })
})

app.post('/usergraph',(req,response) => {
    client.query(`SELECT count(invoice_id) as y,date as label from invoice_data where user_id=$1 group by date`,[req.body.user_id],(err,res) => {
        if(err)
            console.log(err)
        else{
            response.send(res.rows);
        }
    })
})

app.post('/userfilter',(req,response) => {
    client.query(`SELECT invoice_id,invoice_name,date,amount FROM invoice_data where user_id=$1 and date between $2 and $3`,[req.body.user_id,req.body.from,req.body.to],(err,res) => {
        if(err)
            console.log(err)
        else{
            response.send(res.rows);
        }
    })
})

app.post('/adminfilter',(req,response) => {
    client.query(`SELECT invoice_id,username,invoice_name,date,amount FROM invoice_data where date between $1 and $2`,[req.body.from,req.body.to],(err,res) => {
        if(err)
            console.log(err)
        else{
            response.send(res.rows);
        }
    })
})

app.listen(port,() => {
    console.log('Server started on port 5000...');
});
