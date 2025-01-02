# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

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
// install docker in EC2 machine
//log in to dockerhub via EC2