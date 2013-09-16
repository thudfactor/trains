trainData = "";
stationData = "";

trainListContainer = d3.select("#trainList");
stationListContainer = d3.select("#stationList");

/*
 * Update station list
 */
updateStations = function() {
	console.log("Updating stations.");
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
		trainData = data.ArrayOfObjTrainPositions.objTrainPositions;
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
	trainListContainer.selectAll("li")
		.data(trainData)
		.enter()
			.append("li")
				.text(function(d){
					return d.TrainCode;
				})
				.attr({
					"data-status": function(d) {
						console.log(d);
						return d.TrainStatus;
					}
				})
};

updateStations();
updateTrains();




