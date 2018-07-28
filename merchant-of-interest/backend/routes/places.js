var express = require('express');
var router = express.Router();

//mastercard credential
var credentials = require('../config/credentials');
var consumerKey = credentials.mastercard.consumerKey;
var keyStorePath = credentials.mastercard.keyStorePath;
var keyAlias = credentials.mastercard.keyAlias;
var keyPassword = credentials.mastercard.keyPassword;

//places api
var places = require('mastercard-places');
var initialized = false;

function init(){
    // You only need to do initialize MasterCardAPI once
    if (initialized) return;

    var MasterCardAPI = places.MasterCardAPI;

    // For production, set sandbox: false
    var authentication = new MasterCardAPI.OAuth(consumerKey, keyStorePath, keyAlias, keyPassword);
    MasterCardAPI.init({
        sandbox: process.env.NODE_ENV != "production" ,
        authentication: authentication
    });

    initialized = true;
}
module.exports = router;

//register routes
router.get('/merchantPOI', getMerchantPOI);
router.get('/merchantCategoryCodes', getMerchantCategoryCodes);
router.get('/merchantIndustries', getMerchantIndustries);

//implementation
function getMerchantPOI(req, res, next){
    init();

    var requestData = {
        "pageOffset": "0",
        "pageLength": "10",
        "radiusSearch": "true",
        "unit": "km",
        "distance": "15",
        "place": {
            "countryCode": req.query.countryCode,           //can I skip country code?
            "latitude": req.query.lat,
            "longitude": req.query.lng
        }
    };

    places.MerchantPointOfInterest.create(requestData
    , function (error, data) {
        if (error) {
            res.status = 500;
            res.send(error);
            console.log("Error: " + JSON.stringify(error));
        }
        else {
            res.send(data);
            console.log("Success: " + JSON.stringify(data));
        }
    });
}


function getMerchantCategoryCodes(req, res, next){
    init();
    
    var requestData = {

    };

    places.MerchantCategoryCodes.query(requestData
    , function (error, data) {
        if (error) {
            res.status = 500;
            res.send(error);
        }
        else {
            res.send(data);
        }
    });
}

function getMerchantIndustries(req, res, next){
    init();
    
    var requestData = {

    };

    places.MerchantIndustries.query(requestData
    , function (error, data) {
        if (error) {
            res.status = 500;
            res.send(error);
        }
        else {
            res.send(data);
        }
    });
}

module.exports = router;