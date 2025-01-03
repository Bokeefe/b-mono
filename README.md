Brendan's exegenesis monorepo
I'll be trying to store all app ideas, personal projects, and resume examples here

currently running on an AWS EC2 instance here:
<a href="http://ec2-54-212-4-20.us-west-2.compute.amazonaws.com/">http://ec2-54-212-4-20.us-west-2.compute.amazonaws.com/</a>

54.212.4.20 
#### Local build
```
docker rm -f b-mono-container || true
docker rmi -f b-mono-image || true
docker build -t b-mono-image .
docker run -d -p 4171:4171 --name b-mono-container b-mono-image
```

useful commands
 `docker inspect \
   -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' bokeefe96/b-mono-image`
   # 172.17.0.2
   sudo nginx -t

   sudo systemctl restart nginx


deployment reference:
https://youtu.be/rRes9LM-Jh8?si=RRhQxepFsgoXeT6G


// set up runner
SSH into EC2
sudo su
// upgrade the machine
sudo apt update
sudo apt-get upgrade -y
// copy/paste runner commands from GitHub
// I needed to set permissions
sudo chown -R ubuntu:ubuntu ~/actions-runner
chmod -R u+rwx ~/actions-runner
// start runner in background
./run.sh &
// OR TRY
nohup ./run.sh > runner.log 2>&1 &
// install docker in EC2 machine
//log in to dockerhub via EC2
// dummy commit 

