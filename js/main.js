trainData = "";
stationData = "";

trainListContainer = d3.select("#trainList");


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
		trainData.forEach(function(entry){
			parts = entry.PublicMessage.split('\\n');
			entry.Route = parts[1];
			entry.Update = parts[2];
			if (entry.TrainStatus == "N") {
				entry.LateClass = "waiting"				
				return;
			}
			late = entry.PublicMessage.match(/\(([\-0-9].*) mins late\)/);
			entry.Late = late[1];
			if (entry.Late < 0) entry.LateClass = "early";
			else if (entry.Late < 5) entry.LateClass = "ontime"
			else if (entry.Late < 15) entry.LateClass = "late"
			else (entry.LateClass) = "verylate"

		});

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

};

updateTrains();

setInterval(updateTrains,15000);



