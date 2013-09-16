trainData = "";
stationData = "";

trainListContainer = d3.select("#trainList");

dashStatus = [];


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
	console.log("Updating trains.");
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
			{
				label: 'waiting',
				value: 0
			},
			{
				label: 'early',
				value: 0
			},
			{
				label: 'ontime',
				value: 0
			},
			{
				label: 'late',
				value: 0
			},
			{
				label: 'verylate',
				value: 0
			}
		];

		// Walk the data set.
		trainData.forEach(function(entry){
			parts = entry.PublicMessage.split('\\n');
			entry.Route = parts[1];
			entry.Update = parts[2];


			if (entry.TrainStatus == "N") {
				entry.LateClass = "waiting"	
				dashStatus[0].value++			
				return;
			}
			late = entry.PublicMessage.match(/\(([\-0-9].*) mins late\)/);
			entry.Late = late[1];
			if (entry.Late < 0) {
				entry.LateClass = "early";
				dashStatus[1].value++;
			}
			else if (entry.Late < 5) {
				entry.LateClass = "ontime";
				dashStatus[2].value++;
			}
			else if (entry.Late < 15) {
				entry.LateClass = "late";
				dashStatus[3].value++;
			}
			else {
				entry.LateClass = "verylate";
				dashStatus[4].value++;
			}
		});

		console.log(dashStatus);

		displayTrains();
	});
};

/* 
 * Show the stations in a list
 */
displayStations = function () {
	stationListContainer.selectAll("li")
		.data(stationData)
		.enter()
			.append("li")
				.text(function(d){
					return d.StationDesc;
				});
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
	trainList = trainListContainer.selectAll("li").data(trainData);



	// Now, let's treat the 'enter' selection of data -- 
	// the data that is being added.
	newListItems = trainList.enter().append("li")
	newListItems.append("i");
	newListItems.append("span")

	// Just remove items that are leaving the display.
	trainList.exit().remove();	

	// Now, set the attributes for anything remaining.
	trainList.attr({
		"data-lateclass" : function(d) { return d.LateClass },
		"data-status" : function(d) { return d.TrainStatus }
	});

	trainList.select("i").attr("class",function(d) {
		switch(d.LateClass) {
		 case "early":
		 	icon = "icon-flag-checkered";
		 break;
		 case "ontime":
		 	icon = "icon-thumbs-up";
		 break;
		 case "late":
		 	icon = "icon-warning-sign";
		 break;
		 case "verylate":
		 	icon = "icon-frown";
		 break;
		 default: 
		 	icon = "icon-circle";
		}
		return icon;
	});

	trainList.select("span").text(function(d) { return d.TrainCode + " " + d.Route })

	// Our pie chart gets updated when the trains are, too, so let's test that out.

	arc = d3.svg.arc()
		.outerRadius(150)
		.innerRadius(50);

	pie = d3.layout.pie()
		.sort(null)
		.value(function(d) {return d.value})

	pieChart = d3.select("#onTimePortion .pieTarget").selectAll(".arc")
		.data(pie(dashStatus))
		
	pieChart.enter()
		.append("g")
		.attr("class","arc")
		.append("path")

	pieChart.exit().remove()

	pieChart.select("path").transition().attr({
		"d": arc,
		"class": function(d) { console.log(d); return d.data.label; }
	});

	// Now let's make a force-directed chart out of the trains.
	force = d3.layout.force()
		.nodes(trainData)
		.size([400,400])
		.on("tick",tick)
		.start();

	forceChart = d3.select("trainBubbles .bubbles").selectAll(".bubble").data(trainData);

	forceChart.enter().append("circle")
		.attr("class","trainBubble")
		.attr("cx",function(d) { return d.x })
		.attr("cy",function(d) { return d.y })
		.attr("r",8)
		.style("fill","#ccc")
		.call(force.drag)
 

};

updateTrains();

setInterval(updateTrains,15000);



