# My Sexy Book

## Requirements

* [`Node.js`](nodejs.org) + `npm`
* [`MongoDB`](https://www.mongodb.org/)
* [`GraphicsMagick`](http://www.graphicsmagick.org/)
* [`forever`](https://github.com/foreverjs/forever) (Node module)
* [`LESS.js`](http://lesscss.org/) (Node module)

## Running the site

### Locally

#### Compile LESS files

```
lessc -x public/css/mysexybook.less public/css/mysexybook.min.css
```

#### Start servers

```
npm run-script test
```

### In production (using forever)

```
NODE_ENV=production forever start ./ -c "npm run-script start"
```