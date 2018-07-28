import React, { Component } from 'react';
import './Map.css';
import moi from './sample-moi.json'

class Map extends Component {
    constructor(props) {
        super(props)

        fetch(`${process.env.PUBLIC_URL}/places/merchantIndustries`)
            .then(resp => resp.json())
            .then(json => {
                window.industries = json.MerchantIndustryList.MerchantIndustryArray.MerchantIndustry;
            });

        fetch(`${process.env.PUBLIC_URL}/places/merchantCategoryCodes`)
            .then(resp => resp.json())    
            .then(json => {
                window.categories = json.MerchantCategoryCodeList.MerchantCategoryCodeArray.MerchantCategoryCode;
            });
    }

    queryMerchants(pos) {
        var lat = pos.lat;
        var lng = pos.lng;
        var countryCode = pos.countryCode;
        console.log("lat = " + (lat) + ", lng = " + (lng));

        if (process.env.NODE_ENV !== "production") {
            return Promise.resolve(moi);
        }
        else {
            /* Fetch data from server */
            return fetch(`${process.env.PUBLIC_URL}/places/merchantPOI?lat=${lat}&lng=${lng}&countryCode=${countryCode}`)
                .then(response => {
                    if (response.status !== 200) {
                        console.log('Server error - Status Code: ' + response.status);
                        return Promise.reject(new Error("Http error: " + response.status));
                    }
                    return Promise.resolve(response.json());
                })
                .catch(err => {
                    console.log("Fetch error: " + err);
                    return Promise.reject(err);
                });
        }
    }

    extractPlaceDetails(place) {
        function isTrue(value) {
            return value.toLowerCase() === "true"
        }
        function hasFeature(feature, featureName) {
            return featureName + ": " + (isTrue(feature) ? "Yes" : "No")
        }

        function history(place) {
            return isTrue(place.newBusinessFlag) ? "New business"
                : isTrue(place.inBusiness360DayFlag) ? "In business for at least a year"
                    : isTrue(place.inBusiness180DayFlag) ? "In business for at least 6 months"
                        : isTrue(place.inBusiness90DayFlag) ? "In business for at least 90 days"
                            : isTrue(place.inBusiness60DayFlag) ? "In business for at least 60 days"
                                : isTrue(place.inBusiness30DayFlag) ? "In business for at least 30 days"
                                    : isTrue(place.inBusiness7DayFlag) ? "In business for at least 7 days"
                                        : "";
        }
        var industry = window.industries.find(
            industry => industry.Industry ===  place.industry) || {IndustryName: place.industry};
        industry = industry.IndustryName ;
        var category = window.categories.find(
            cat => cat.MerchantCatCode ===  place.mccCode) || {MerchantCategoryName: place.mccCode};
        category = category.MerchantCategoryName;
        return {
            "place-name": place.cleansedMerchantName,
            "place-address": place.cleansedStreetAddr,
            "place-classification": "Business: " + industry + " / " + category,
            "place-features": hasFeature(place.cashBack, "Cashback")
                + ", " + hasFeature(place.payAtThePump, "Pay at the pump")
                + ", " + hasFeature(place.nfcFlag, "Accept NFC"),
            "place-history": history(place)
        }
    }

    searchMerchantsAndDisplay(location, map, infowindowContent, infowindow) {
        var google = window.google;
        map.setCenter(location);
        var locationMarker = window.locationMarker;
        if (locationMarker) {
            locationMarker.setVisible(false);
        }
        locationMarker = new google.maps.Marker({
            map: map,
        });
        locationMarker.setPosition(location);
        window.locationMarker = locationMarker;

        window.queryMerchants(location)
            .then(moiQueryResp => {
                if (!moiQueryResp.MerchantPOIResponse
                    || !moiQueryResp.MerchantPOIResponse.places
                    || !moiQueryResp.MerchantPOIResponse.places.place
                    || moiQueryResp.MerchantPOIResponse.places.place.length <= 0
                ) {
                    alert("No interesting merchant found");
                    return;
                }

                var count = 0;
                var bounds = new google.maps.LatLngBounds();
                bounds.extend(location);
                moiQueryResp.MerchantPOIResponse.places.place.forEach(place => {
                    var pos = {
                        lat: Number(place.latitude),
                        lng: Number(place.longitude)
                    }
                    var marker = new google.maps.Marker({
                        map: map,
                        label: place.merchantName[0]
                    });
                    var placeDetails = window.extractPlaceDetails(place);
                    marker.addListener('click', function (e) {
                        infowindowContent.children['place-name'].textContent = placeDetails['place-name'];
                        infowindowContent.children['place-address'].textContent = placeDetails['place-address'];;
                        infowindowContent.children['place-classification'].textContent = placeDetails['place-classification'];
                        infowindowContent.children['place-features'].textContent = placeDetails['place-features'];
                        infowindowContent.children['place-history'].textContent = placeDetails['place-history'];
                        infowindow.open(map, this);
                    });

                    marker.setPosition(pos);
                    bounds.extend(pos);
                    console.log(count++ + " - Places: Lat: " + pos.lat + ", lng: " + pos.lng);
                });
                map.setCenter(location);
                map.fitBounds(bounds);
                map.setZoom(map.getZoom() - 1);

                //map.panToBounds(bounds);
            })
            .catch(err => {
                console.log("Query merchant error: " + err);
            });
    }

    initMap() {
        var pos = { lat: -33.8688, lng: 151.2195 };

        var google = window.google;
        var map = new google.maps.Map(document.getElementById('map'), {
            center: pos,
            zoom: 14
        });

        var infowindow = new google.maps.InfoWindow();
        var infowindowContent = document.getElementById('infowindow-content');
        infowindow.setContent(infowindowContent);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                }
                map.setCenter(pos);
                //reverse geocoding to obtain country code
                var geocoder = new google.maps.Geocoder;
                geocoder.geocode({'location': pos}, function(results, status) {
                    if (status === 'OK') {
                        if (results[0]) {
                            pos.countryCode = results[0].address_components.find(component => component.types.find(type => type === "country")).short_name
                            window.searchMerchantsAndDisplay(pos, map, infowindowContent, infowindow);
                        } else {
                            window.alert('No results found');
                        }
                    } else {
                        window.alert('Geocoder failed due to: ' + status);
                    }
                });
            });
        }

        var input = document.getElementById('location-input');
        map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(input);

        var autocomplete = new google.maps.places.Autocomplete(input);

        // // Bind the map's bounds (viewport) property to the autocomplete object,
        // // so that the autocomplete requests use the current map bounds for the
        // // bounds option in the request.
        autocomplete.bindTo('bounds', map);

        // // Set the data fields to return when the user selects a place.
        autocomplete.setFields(['address_components', 'geometry', 'icon', 'name']);

        autocomplete.addListener('place_changed', function () {
            var place = autocomplete.getPlace();
            if (!place.geometry) {
                // User entered the name of a Place that was not suggested and
                // pressed the Enter key, or the Place Details request failed.
                window.alert("No details available for input: '" + place.name + "'");
                return;
            }
            var location = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                countryCode: place.address_components.find(component => component.types.find(type => type === "country")).short_name
            }

            window.searchMerchantsAndDisplay(location, map, infowindowContent, infowindow);
        });

    }

    componentDidMount() {
        window.initMap = this.initMap;
        window.queryMerchants = this.queryMerchants;
        window.searchMerchantsAndDisplay = this.searchMerchantsAndDisplay;
        window.extractPlaceDetails = this.extractPlaceDetails;

        const script = document.createElement("script");

        script.src = "https://maps.googleapis.com/maps/api/js?key=[GOOGLE_MAP_KEY]&libraries=places&callback=initMap";
        script.async = true;

        document.body.appendChild(script);

    }

    render() {
        return (
            <div>
                <input id="location-input" type="text" placeholder="Enter a location" />

                <div id="map"></div>

                <div id="infowindow-content">
                    <img src="" width="16" height="16" id="place-icon" alt='' />
                    <span id="place-name" className="title"></span><br />
                    <span id="place-address"></span><br />
                    <span id="place-classification"></span><br />
                    <span id="place-features"></span><br />
                    <span id="place-history"></span><br />

                </div>
            </div>
        );
    }
}

export default Map;
