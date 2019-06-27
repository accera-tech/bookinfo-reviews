const dispatcher = require('httpdispatcher');
const http = require('http');
const grpc = require('grpc');
const grpcPromise = require('grpc-promise');
const protoLoader = require('@grpc/proto-loader');

const PORT = parseInt(process.argv[2]);

const RATINGS_ENABLED = process.env.ENABLE_RATINGS;
const STAR_COLOR = process.env.STAR_COLOR;
const RATINGS_SERVICE = `ratings:9080`;

const PROTO_PATH = `${__dirname}/proto/ratings.proto`;

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

const ratingsProto = grpc.loadPackageDefinition(packageDefinition).ratings;

dispatcher.onGet('/health', function (_, res) {
    res.writeHead(200, { 'Content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'Reviews is healthy' }));
});

dispatcher.onGet(/^\/reviews\/[0-9]*/, async function (req, res) {
    var productIdStr = req.url.split('/').pop();
    var productId = parseInt(productIdStr);

    if (Number.isNaN(productId)) {
        res.writeHead(400, { 'Content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'please provide numeric product ID' }));
    } else {
        await getLocalReviewsSuccessful(res, productId);
    }
});

async function getLocalReviewsSuccessful(res, productId) {
    var reviews = await getLocalReviews(productId);

    res.writeHead(200, { 'Content-type': 'application/json' });
    res.end(JSON.stringify(reviews));
}

async function getLocalReviews(productId) {
    var result = {
        id: productId,
        reviews: [
            {
                reviewer: "Reviewer1",
                text: "An extremely entertaining play by Shakespeare. The slapstick humour is refreshing!"
            },
            {
                reviewer: "Reviewer2",
                text: "Absolutely fun and entertaining. The play lacks thematic depth when compared to other plays by Shakespeare."
            }
        ]
    };

    const client = new ratingsProto.RatingsService(RATINGS_SERVICE, grpc.credentials.createInsecure());

    grpcPromise.promisifyAll(client);

    if (RATINGS_ENABLED) {
        await client.get()
            .sendMessage({ productId: productId })
            .then(response => {
                result.reviews[0].rating = {
                    stars: parseInt(response.reviewers[0].rate),
                    color: STAR_COLOR
                };
                result.reviews[1].rating = {
                    stars: parseInt(response.reviewers[1].rate),
                    color: STAR_COLOR
                };
            })
            .catch(err => {
                result.reviews[0].rating = {
                    error: "Ratings service is currently unavailable"
                };
                result.reviews[1].rating = {
                    error: "Ratings service is currently unavailable"
                };
            });
    }
    return result;
}

function handleRequest(request, response) {
    try {
        console.log(request.method + ' ' + request.url);
        dispatcher.dispatch(request, response);
    } catch (err) {
        console.log(err);
    }
}

var server = http.createServer(handleRequest);

server.listen(PORT, function () {
    console.log('Server listening on: http://0.0.0.0:%s', PORT);
});