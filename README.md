To run it:


Clone the repo and open in VS Code


Create a .env file in the folder. It will contain all the secret keys of the amazon s3 cloudfront. Ask it from Gulshan.


When running, make sure that both your devices(computer and mobile) are on the same network.


Now go to app.js and find this line:  const UPLOAD_ENDPOINT = 'http://10.217.68.49:3000/upload-glb';


Find your IP address and replace 10.217.68.49 with your personal IP address


Now open the terminal and run the following command: node server.js


Open another new terminal and there run :php -S 0.0.0.0:8000  (You need to have php and node installed in your computer locally)


Now go to http://(Your IP ADDRESS):8000/index.php in your chrome browser. You should find the webpage working if things went fine till here.


And voila! you can see scaled doors in real life.
