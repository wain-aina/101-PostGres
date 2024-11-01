## Pre-requisites
 
Install Git, PostGreSQL & NodeJS (if you haven't);

The project uses GitBash which comes installed with Git.

## Package dependencies

Once you have extracted the project in you preferred location, navigate to the bash terminal inside vs code.

Run the following command inside  to install the project dependencies:

npm install

## ENV Variables

In the .env file, add the following:

AUTH_EMAIL : *This is the email address that will be used for password reset. This project uses smtp gmail protocol thus a gmail account is required*

AUTH_APP_PASS : *This is the password to your email account. Because Google doesn't allow you to use your actual password, it uses a pseudo password known as app password. Follow this link for instructions on how to acquire it* https://knowledge.workspace.google.com/kb/how-to-create-app-passwords-000009237

API_KEY : *Retrieve API_KEY from this website* https://www.exchangerate-api.com/

DB_USER : *This is the username you created when you set up Postgres*

DB_LOCATION : *This is the ip address assigned to you when you set up Postgres*

DB_NAME : *This is the name of the databse you created when you set up this project*

DB_PASS : *This is the password you created when you set up Postgres*

PORT : *This is the port assigned to Postgres. By default it is 5432*

SECRET : *This is the secret you created for user sessions and cookies. It can be a random string*


## Run The Program

Once the above requirements have been fulfilled, run the following command;

npx nodemon index

This command will start the server as well as initiate connection to the database.

## Enjoy

ENJOY
