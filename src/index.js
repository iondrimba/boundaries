import App from './app';

try {
  new App().init();

  if (module.hot.active) {
    module.hot.accept(['./app.js', './style.css'], () => {
      new App().init();
    });
  }
} catch (error) {
  console.log(error);
}
