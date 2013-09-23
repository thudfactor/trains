trainData = "";
stationData = "";

trainListContainer = d3.select("#trainList");

dashStatus = [];

// Map variables; use several places. We're
// using the albers equal-area projection
// as recommended by Mike Bostock at 
// http://bost.ocks.org/mike/map/, but you
// have other options. 
projection = d3.geo.albers()    
			.center([-8, 53.3345])
	    .rotate([1.5, -1.0])
	    .parallels([50, 60])
	    .scale(10000)
	    .translate([200,200])

// Create a path function for making 
// sense out of geospatial data. This should
// map coordinates using the projection defined
// above.
path = d3.geo.path().projection(projection);

// These variables will store our map layers
map = "";
mapTrain = "";
mapStation= "";

updateMap = function() {
	d3.json("mapping/ireland.json",function(error,data){
		// First, let's store our map layers so we can 
		// get to them more easily.
		map = d3.select("#map .mapTarget");
		mapTrain = d3.select("#map .trainTarget");
		mapStation = d3.select("#map .stationTarget");

		// the subunits are the poltitical entity borders.
		// In this set, Ireland, North Ireland England,
		// Scotland, Wales.
		console.log(data);
		subunits = topojson.feature(data,data.objects.subunits);
		counties = topojson.feature(data,data.objects.counties);
		places = topojson.feature(data,data.objects.places);
		rr = topojson.feature(data,data.objects.smaller_rr);
		
		// Draw those.
		map.selectAll(".subunit")
			.data(subunits.features).enter()
				.append("path")
				.attr("class",function(d){ return "subunit " + d.id})
				.attr("d",path)

		// Now, let's get border information out and
		// draw some borders. This strategy, described by 
		// Mike Bostock at http://bost.ocks.org/mike/map/, 
		// "computes boundaries from the topology."

		// Find interior borders.
		map.append("path")
			.datum(topojson.mesh(data,data.objects.subunits, function(a,b){
				return a !== b;
			})
			)
			.attr("d",path)
			.attr("class","subunit-boundary interior")

		// And now the coastlines.
		map.append("path")
			.datum(topojson.mesh(data,data.objects.subunits, function(a,b){
				return a === b;
			})
			)
			.attr("d",path)
			.attr("class","subunit-boundary exterior")

		// counties
		map.append("path")
			.datum(counties)
			.attr("d",path)
			.attr("class","counties")
			.style({
				fill: "none",
				stroke: "#ccc"
			});

		// railroads
		map.append("path")
			.datum(rr)
			.attr("d",path)
			.attr("class","railroads")

		// Lets get a station list so we can add these to the map
		updateStations();
	});

}


/*
 * Update station list
 */
updateStations = function() {
	// Make our API request; on return, the data is assigned
	// to our global data object and the station display routine
	// is invoked.
	d3.json("api.php?q=stations",function(error,data){
		stationData = data.ArrayOfObjStation.objStation;
		displayStations();
	});
};

/*
 * Update train list
 */
updateTrains = function() {
	d3.json("api.php?q=trains",function(error,data){
		// Make our API request; on return, the data is assigned
		// to our global data object and the train display routine
		// is invoked.
		trainData = data.ArrayOfObjTrainPositions.objTrainPositions;

		trainData.sort(function(a,b){
			if (a.TrainCode > b.TrainCode) return 1;
			if (a.TrainCode < b.TrainCode) return -1;
			if (a.TrainCode == b.TrainCode) return 0;
		});
		
		// Let's do some post-processing of the data to extract a little
		// more information out of that public message.

		// While we're steping through this, generating the data,
		// let's create a parallel data set that we'll use
		// to build a pie chart of train status.
		dashStatus = [
			{ label: 'waiting', value: 0 },
			{ label: 'early', value: 0 },
			{	label: 'ontime', value: 0 },
			{ label: 'late', value: 0 },
			{	label: 'verylate', value: 0 }
		];

		// Walk the data set.
		trainData.forEach(function(entry){
			parts = entry.PublicMessage.split('\\n');
			entry.Route = parts[1];
			entry.Update = parts[2];

			routeParts = entry.Route.split(" - ");
			if(routeParts.length > 1) {
				trainTime = routeParts[0];
				trainRoute = routeParts[1];
				entry.Time = trainTime;
				entry.Route = trainRoute;
			}
			else {
				entry.Time = entry.Update.replace(/Expected Departure/,"")
				trainRoute = entry.Route;
			}

			if (entry.TrainStatus == "N") {
				entry.LateClass = "waiting";
				entry.LateLabel = "Wait";
				entry.LateIcon = "icon-circle";
				dashStatus[0].value++			
				return;
			}
			late = entry.PublicMessage.match(/\(([\-0-9].*) mins late\)/);
			entry.Route = entry.Route.replace(/\([\-0-9].* mins late\)/,'');
			entry.Late = late[1];
			if (entry.Late < 0) {
				entry.LateClass = "early";
				entry.LateLabel = "Early";
				entry.LateIcon = "icon-flag-checkered";
				dashStatus[1].value++;
			}
			else if (entry.Late < 5) {
				entry.LateClass = "ontime";
				entry.LateLabel = "On Time";
				entry.LateIcon = "icon-thumbs-up";
				dashStatus[2].value++;
			}
			else if (entry.Late < 15) {
				entry.LateClass = "late";
				entry.LateLabel = "Late";
				entry.LateIcon = "icon-warning-sign";
				dashStatus[3].value++;
			}
			else {
				entry.LateClass = "verylate";
				entry.LateLabel = "OMG";
				entry.LateIcon = "icon-frown";
				dashStatus[4].value++;
			}
		});

		displayTrains();
	});
};

/* 
 * Show the stations in a list
 */
displayStations = function () {
	mapStation.selectAll(".station").data(stationData).enter()
		.append("rect")
		.attr({
			"x": -5,
			"y": -5,
			"height": 10,
			"width": 10,
			"class": "station",
			"transform": function(d) {
				return "translate(" + projection([d.StationLongitude,d.StationLatitude]) + ")";
			}
		});

	/*
	stationListContainer.selectAll("li")
		.data(stationData)
		.enter()
			.append("li")
				.text(function(d){
					return d.StationDesc;
				});
	*/
};

/*
 * Show the trains in a list
 */
displayTrains = function() {
	// This becomes a more complex operation
	// since we want to structure each train's
	// information a little more carefully.
	//
	// First, let's bind the data.
	//
	// The second parameter in the data() method
	// describes a "key" function for object constancy.
	// This is needed to make sure that, despite the order
	// of data, correct elements are added, removed, transformed.
	// This is less critical when there's no animation, but with 
	// animation it is very important. 
	// 
	// We will need to use this key anyhere we bind train data.
	trainKey = function (d) {return d.TrainCode;}
	trainList = trainListContainer.selectAll("li").data(trainData,trainKey);



	// Now, let's treat the 'enter' selection of data -- 
	// the data that is being added.
	newListItems = trainList.enter().append("li")
	statusBlock = newListItems.append("span").attr("class","status")
	nameBlock = newListItems.append("span").attr("class","name-time")

	// Just remove items that are leaving the display.
	trainList.exit().remove();	

	// Now, set the attributes for anything remaining.
	trainList.attr({
		"data-lateclass" : function(d) { return d.LateClass },
		"data-status" : function(d) { return d.TrainStatus }
	});

	statusBlock.append("i").attr("class",function(d) { return d.LateIcon; });
	statusBlock.append("span").attr("class","statusText").text(function(d) { return d.LateLabel} );
	statusBlock.append("br")
	statusBlock.append("span").attr("class","time").text(function(d) {
		if (!d.Late) return "";
		unit = (Math.abs(d.Late) == 1) ? " min" : " mins"
		return Math.abs(d.Late) + unit;
	});

	nameBlock.append("span").attr("class","trainCode").text(function(d) { return d.TrainCode + " " + d.Time + " " + d.Route});
	nameBlock.append("br")
	nameBlock.append("span").attr("class","trainRoute").text(function(d) { return d.Update });

	// Show train positions on the map
	
	if(mapTrain.selectAll) {
		trainPins = mapTrain.selectAll(".train").data(trainData,trainKey)

		// We initialize the enter set with data elements (when we don't normally)
		// because we are running transitions on them. If we don't add data at
		// creation time here, we will transition from 0,0.
		// We do want them to fade in instead of "pop" in, so we'll also set initial
		// opacity to 0.
		trainPins.enter()
			.append("circle")
			.attr({
				"cx": 0,
				"cy": 0,				
				"class": "train",
				"r": 4,
				"transform": function(d) {
					return "translate(" + projection([d.TrainLongitude,d.TrainLatitude]) + ")";
				}				
			});

		trainPins.exit().remove();

		// With the transition in place, we can see the trains "move"
		// from point to point.
		trainPins
			.transition()
				.duration(10000)
			.attr({
				"class": function(d) {
					return "train " + d.LateClass;
				},
				"transform": function(d) {
					return "translate(" + projection([d.TrainLongitude,d.TrainLatitude]) + ")";
				}
			});
	}


	// Our pie chart gets updated when the trains are, too, so let's test that out.

	arc = d3.svg.arc()
		.outerRadius(11)
		.innerRadius(7);

	pie = d3.layout.pie()
		.sort(null)
		.value(function(d) {return d.value})

	// Remove 0-value items which sometimes show up anyway for why I don't know.
	dashStatus = dashStatus.filter(function(e){
		return (e.value > 0);
	});

	pieChart = d3.select("#onTimePortion .pieTarget").selectAll(".arc")
		.data(pie(dashStatus))
		
	pieChart.enter()
		.append("g")
		.attr("class","arc")
		.append("path")

	pieChart.exit().remove()

	pieChart.select("path").transition().attr({
		"d": arc,
		"class": function(d) { return d.data.label; }
	});

}

updateMap();
updateTrains();


setInterval(updateTrains,30000);



