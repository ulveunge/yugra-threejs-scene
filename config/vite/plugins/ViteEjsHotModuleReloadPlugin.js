export default function () {
  return {
    name: 'ejs-hot-module-reload',
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.ejs')) {
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
  };
}
