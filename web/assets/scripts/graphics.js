/********* 
CREDITS
- scatterplot adapted from http://bl.ocks.org/mbostock/3887118
- tooltips loosely adapted from https://bl.ocks.org/d3noob/a22c42db65eb00d4e369
*********/


/*********
HELPER FUNCTIONS
**********/

var commaSeparateNumber = d3.format("0,");
var formatPercent = d3.format(".0%");
var formatPercentWhole = function(d) { return d + "%"; }
var formatDollars = d3.format("$0,");

var makeSlug = function(str) {
    slug = str.replace(/[^a-z0-9-]/gi, '-').
    	replace(/-+/g, '-').
    	replace(/^-|-$/g, '');
    return slug.toLowerCase();
}

// TIME PARSERS
var parseYear = d3.time.format("%Y").parse;
var parseYearMonth = d3.time.format("%Y_%m").parse;


// least squares regression for trendlines
// from http://bl.ocks.org/benvandyke/8459843
function leastSquares(xSeries, ySeries) {
	var reduceSumFunc = function(prev, cur) { return prev + cur; };
	
	var xBar = d3.mean(xSeries);
	var yBar = d3.mean(ySeries);

	var ssXX = xSeries.map(function(d) { return Math.pow(d - xBar, 2); })
		.reduce(reduceSumFunc);
	
	var ssYY = ySeries.map(function(d) { return Math.pow(d - yBar, 2); })
		.reduce(reduceSumFunc);
		
	var ssXY = xSeries.map(function(d, i) { return (d - xBar) * (ySeries[i] - yBar); })
		.reduce(reduceSumFunc);
		
	var slope = ssXY / ssXX;
	var intercept = yBar - (xBar * slope);
	// var rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);
	
	return [slope, intercept];
}

function getTrendlinePoints(xSeries, ySeries, xScale, yScale) {

	// run ols
	var leastSquaresCoeff = leastSquares(xSeries, ySeries);
	var slope = leastSquaresCoeff[0];
	var intercept = leastSquaresCoeff[1];
	
	// apply the results of the least squares regression
	var x1 = d3.min(xSeries);
	var y1 = intercept + slope * x1;
	var x2 = d3.max(xSeries);
	var y2 = intercept + slope * x2;

	// scale values
	var scaleX1 = xScale(x1);
	var scaleY1 = yScale(y1);
	var scaleX2 = xScale(x2);
	var scaleY2 = yScale(y2);

	return [scaleX1, scaleY1, scaleX2, scaleY2];
}


/**********
Shared chart pieces
**********/

function buildChartWrapper(wrapper_id, margin) {
	
	var wrapper = d3.select(wrapper_id);
	var wrapper_width = wrapper.node().getBoundingClientRect().width;

	var width = wrapper_width - margin.left - margin.right,
		height = (width * .66) - margin.top - margin.bottom;

	var svg = wrapper.insert("svg", ":first-child")
		.attr("class", "plot--left-axis")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	return [wrapper, svg, width, height];
}

/*********
Pop growth by income/rent scatterplot
*********/

function scatterplot(wrapper_id, data, cols, labels, axis_formats, btn_ids,  buildTooltipFunction, updateTooltipFunction) {

	/*************
	PlOT BASICS
	*************/

	var margin = {top: 10, right: 0, bottom: 60, left: 70};

	var wrapper_elements = buildChartWrapper(wrapper_id, margin);
	var wrapper = wrapper_elements[0],
		svg = wrapper_elements[1],
		width = wrapper_elements[2],
		height = wrapper_elements[3];
	
	/*************
	SCALES
	*************/

	// extract values to build scales more efficiently
	var x1_series = data.map(function(d) {return d[cols.x1]; });
	var y1_series = data.map(function(d) {return d[cols.y1]; });

	var x1_padding = d3.deviation(x1_series) / 10;
	var y1_padding = d3.deviation(y1_series) / 8;

	var activeXseries = x1_series,
		activeYseries = y1_series;

	// prep scales
	var x1_scale = d3.scale.linear()
		.domain([
			d3.min(x1_series) - x1_padding,
			d3.max(x1_series) + x1_padding
		])
		.range([0, width]);

	var y1_scale = d3.scale.linear()
		.domain([
			d3.min(y1_series) - y1_padding,
			d3.max(y1_series) + y1_padding
		])
		.range([height, 0]);

	var activeXscale = x1_scale,
		activeYscale = y1_scale;

	// prep axes

	var x1_axis = d3.svg.axis()
		.scale(x1_scale)
		.orient("bottom");

	if (axis_formats.x1 !== null) {
		x1_axis.tickFormat(axis_formats.x1);
	}

	var y1_axis = d3.svg.axis()
		.scale(y1_scale)
		.orient("left");

	if (axis_formats.y1 !== null) {
		y1_axis.tickFormat(axis_formats.y1);
	}

	// prep second x axis if one
	if (cols.x2 !== null) {

		var x2_series = data.map(function(d) {return d[cols.x2]; });
		var x2_padding = d3.deviation(x2_series) / 10;

		var x2_scale = d3.scale.linear()
			.domain([
				d3.min(x2_series) - x2_padding,
				d3.max(x2_series) + x2_padding
			])
			.range([0, width]);

		var x2_axis = d3.svg.axis()
			.scale(x2_scale)
			.orient("bottom");

		if (axis_formats.x2 !== null) {
			x2_axis.tickFormat(axis_formats.x2);
		}
	}

	// prep second y axis if one
	if (cols.y2 !== null) {

		var y2_series = data.map(function(d) {return d[cols.y2]; });
		var y2_padding = d3.deviation(y2_series) / 8;

		var y2_scale = d3.scale.linear()
			.domain([
				d3.min(y2_series) - y2_padding,
				d3.max(y2_series) + y2_padding
			])
			.range([height, 0]);

		var y2_axis = d3.svg.axis()
			.scale(y2_scale)
			.orient("left");

		if (axis_formats.y2 !== null) {
			y2_axis.tickFormat(axis_formats.y2);
		}
	}

	/*************
	AXES
	*************/

	svg.append("g")
		  .attr("class", "x axis")
		  .attr("transform", "translate(0," + height + ")")
		  .call(x1_axis)
		.append("text")
		  .attr("class", "axis__label")
		  .attr("x", width / 2)
		  .attr("y", 50)
		  .style("text-anchor", "middle")
		  .text(labels.x1);

	svg.append("g")
		.attr("class", "y axis")
		.call(y1_axis)
	  .append("text")
		.attr("class", "axis__label")
		.attr("transform", "rotate(-90)")
		.attr("y", -60)
		.attr("x", height / -2)
		.style("text-anchor", "middle")
		.text(labels.y1)


	/*************
	TRENDLINE
	*************/

	var trendPoints = getTrendlinePoints(activeXseries, activeYseries, activeXscale, activeYscale);

	var trendline = svg.append("line")
				.attr("class", "trendline")
				.attr("x1", trendPoints[0])
				.attr("y1", trendPoints[1])
				.attr("x2", trendPoints[2])
				.attr("y2", trendPoints[3]);

	/*************
	DATA POINTS
	*************/

	var points = svg.selectAll(".dot")
		.data(data)
	  .enter().append("circle")
		.attr("class", "dot")
		.attr("r", 4.5)
		.attr("cx", function(d) { return activeXscale(d[cols.x1]); })
		.attr("cy", function(d) { return activeYscale(d[cols.y1]); });

	/*************
	TOOLTIPS
	*************/

	if (buildTooltipFunction !== null) {

		var tooltip_elements = buildTooltipFunction(wrapper);
		var tooltip = tooltip_elements[0];

		function mouseoverHandler(d, i) {

			// select which x var to use as axis
			raw_x_val = null;

			if (activeXscale == x1_scale) {
				raw_x_val = d[cols.x1];
			} else if (activeXscale == x2_scale) {
				raw_x_val = d[cols.x2];
			}

			// select which y var to use as axis
			raw_y_val = null;

			if (activeYscale == y1_scale) {
				raw_y_val = d[cols.y1];
			} else if (activeYscale == y2_scale) {
				raw_y_val = d[cols.y2];
			}

			// get positions for tooltip
			xPos = Math.round(activeXscale(raw_x_val) + margin.left/2 + 9);
			yPos = Math.round(activeYscale(raw_y_val));

			// move tooltip
			tooltip.style('opacity', 1)
				.style('z-index', 10)
				.style("left", xPos + "px")
				.style("top", yPos + "px");

			// update tooltip values
			updateTooltipFunction(tooltip_elements, d);
		}

		function mouseoutHandler(d,i) {
			tooltip.style('opacity', 0)
				.style('z-index', -1);
		}

		points.on("mouseover", mouseoverHandler)
			.on("mouseout", mouseoutHandler);

	}

	/*************
	TOGGLE GRAPH
	*************/

	// toggle x axis

	if (cols.x2 !== null) {

		// toggle graph based on button clicks
		d3.select(btn_ids.x1).on("click", function() {

			// set active xScale and xSeries
			activeXscale = x1_scale;
			activeXseries = x1_series;

			// toggle selected classes
			d3.select(this).classed("plot-toggle__btn--selected", true);
			d3.select(btn_ids.x2).classed("plot-toggle__btn--selected", false);

			// change trendline
			trendPoints = getTrendlinePoints(activeXseries, activeYseries, activeXscale, activeYscale);

			trendline.transition()
				.duration(1000)
				.attr("x1", trendPoints[0])
				.attr("y1", trendPoints[1])
				.attr("x2", trendPoints[2])
				.attr("y2", trendPoints[3]);

			// move points
			points.transition()
			.duration(1000)
			.attr("cx", function(d) { return activeXscale(d[cols.x1]); });

			// change x axis
			svg.select('g.x.axis')
				.transition()
				.duration(500)
				.call(x1_axis)
				.select('text.axis__label')
					.text(labels.x1);
		});


		d3.select(btn_ids.x2).on("click", function() {

			// set active xScale to use in tooltips
			activeXscale = x2_scale;
			activeXseries = x2_series;

			// toggle selected classes
			d3.select(this).classed("plot-toggle__btn--selected", true);
			d3.select(btn_ids.x1).classed("plot-toggle__btn--selected", false);

			// change trendline
			trendPoints = getTrendlinePoints(activeXseries, activeYseries, activeXscale, activeYscale);

			trendline.transition()
				.duration(1000)
				.attr("x1", trendPoints[0])
				.attr("y1", trendPoints[1])
				.attr("x2", trendPoints[2])
				.attr("y2", trendPoints[3]);

			// move points
			points.transition()
				.duration(1000)
				.attr("cx", function(d) { return activeXscale(d[cols.x2]); });

			// change x axis
			svg.select('g.x.axis')
				.transition()
				.duration(500)
				.call(x2_axis)
				.select('text.axis__label')
					.text(labels.x2);
		});
	}

	// toggle y axis
	
	if (cols.y2 !== null) {

		// toggle graph based on button clicks
		d3.select(btn_ids.y1).on("click", function() {

			// set active xScale to use in tooltips
			activeYscale = y1_scale;
			activeYseries = y1_series;

			// toggle selected classes
			d3.select(this).classed("plot-toggle__btn--selected", true);
			d3.select(btn_ids.y2).classed("plot-toggle__btn--selected", false);

			// change trendline
			trendPoints = getTrendlinePoints(activeXseries, activeYseries, activeXscale, activeYscale);

			trendline.transition()
				.duration(1000)
				.attr("x1", trendPoints[0])
				.attr("y1", trendPoints[1])
				.attr("x2", trendPoints[2])
				.attr("y2", trendPoints[3]);

			// move points
			points.transition()
			.duration(1000)
			.attr("cy", function(d) { return activeYscale(d[cols.y1]); });

			// change y axis
			svg.select('g.y.axis')
				.transition()
				.duration(500)
				.call(y1_axis)
				.select('text.axis__label')
					.text(labels.y1);
		});


		d3.select(btn_ids.y2).on("click", function() {

			// set active yScale
			activeYscale = y2_scale,
			activeYseries = y2_series;

			// toggle selected classes
			d3.select(this).classed("plot-toggle__btn--selected", true);
			d3.select(btn_ids.y1).classed("plot-toggle__btn--selected", false);

			// change trendline
			trendPoints = getTrendlinePoints(activeXseries, activeYseries, activeXscale, activeYscale);

			trendline.transition()
				.duration(1000)
				.attr("x1", trendPoints[0])
				.attr("y1", trendPoints[1])
				.attr("x2", trendPoints[2])
				.attr("y2", trendPoints[3]);

			// move points
			points.transition()
				.duration(1000)
				.attr("cy", function(d) { return activeYscale(d[cols.y2]); });

			// change x axis
			svg.select('g.y.axis')
				.transition()
				.duration(500)
				.call(y2_axis)
				.select('text.axis__label')
					.text(labels.y2);
		});
	}
}



/*************
TORNADO
*************/

function tornado(wrapper_id, data) {

	// extract values to build scales more efficiently
	var workers_series = data.map(function(d) {return d.total_workers_2014; });
	var housing_series = data.map(function(d) {return d.housing_units_est_2014; });
	var ratio_series = data.map(function(d) {return d.workers_housing_ratio_2014; });
	var ratio_series = data.map(function(d) {return d.total_workers_2014; });

	// sort ratio series descending
	ratio_series.sort(function(a, b){return b-a});

	/*************
	PlOT BASICS
	*************/

	var wrapper = d3.select(wrapper_id);
	var wrapper_width = wrapper.node().getBoundingClientRect().width;

	var bar_height = 25,
		bar_space = 5;

	var margin = {top: 35, right: 150, bottom: 0, left: 150},
		width = wrapper_width - margin.left - margin.right,
		height = ((bar_height + bar_space) * workers_series.length);

	var svg = wrapper.insert("svg", ":first-child")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	/*************
	SCALES
	*************/

	// prep scales
	var workers_scale = d3.scale.linear()
		.domain([0, d3.max(workers_series)])
		.range([0, width/2]);

	var y_scale = d3.scale.linear()
		.domain([0, ratio_series.length])
		.range([0, ratio_series.length * (bar_height + bar_space)]).nice();


	/*************
	DRAW BARS
	*************/

	var rows = svg.selectAll("tornado__row")
		.data(data)
	  .enter().append("g")
		.attr("class", "tornado__row")
		.attr("width", width)
		.attr("height", bar_height)
		.attr("x", 0)
		.attr("transform", function(d){
			var index_val = ratio_series.indexOf(d.total_workers_2014);
			return "translate(0," + y_scale(index_val) + ")";
		});

	var housing_bars = rows.append("rect")
		.attr("class", "tornado__bar--housing")
		.attr("width", function(d){
			return workers_scale(d.housing_units_est_2014);
		})
		.attr("x", width/2 + 1)
		.attr("height", bar_height);

	var workers_bars = rows.append("rect")
		.attr("class", "tornado__bar--workers")
		.attr("width", function(d){
			return workers_scale(d.total_workers_2014);
		})
		.attr("x", function(d){
			return width/2 - workers_scale(d.total_workers_2014) - 1;
		})
		.attr("height", bar_height);

	var place_labels = rows.append("text")
		.attr("class", "tornado__label tornado__label--place")
		.text(function(d) {
			return d.clean_name;
		})
		.attr("x", function(){
			return margin.left * -1;
		})
		.attr("y", 17)
		.attr("text-anchor", "start");

	var worker_labels = rows.append("text")
		.attr("class", "tornado__label tornado__label--workers")
		.text(function(d) {
			return commaSeparateNumber(d.total_workers_2014);
		})
		.attr("x", function(d){
			x = width/2 - workers_scale(d.total_workers_2014) - 10;
			return x;
		})
		.attr("y", 17)
		.attr("text-anchor", "end");

	var housing_labels = rows.append("text")
		.attr("class", "tornado__label tornado__label--housing")
		.text(function(d) {
			return commaSeparateNumber(d.housing_units_est_2014);
		})
		.attr("x", function(d){
			x = width/2 + workers_scale(d.housing_units_est_2014) + 10;
			return x;
		})
		.attr("y", 17)
		.attr("text-anchor", "start");

	// var labels = rows.append("text")
	// 	.attr("class", "tornado__label")
	// 	.text(function(d) {
	// 		return d.clean_name;
	// 	})
	// 	.attr("x", function(d){
	// 		if (d.workers_housing_ratio_2014 > 1) {
	// 			x = width/2 - workers_scale(d.total_workers_2014) - 10;
	// 		} else {
	// 			x = width/2 + workers_scale(d.housing_units_est_2014) + 10;
	// 		}
	// 		return x;
	// 	})
	// 	.attr("y", 16)
	// 	.attr("text-anchor", function(d){
	// 		if (d.workers_housing_ratio_2014 > 1) {
	// 			return "end";
	// 		} else {
	// 			return "start";
	// 		}
	// 	});


	/*************
	CHART LABELS
	*************/
	var workers_label = svg.append("text")
		.attr("class", "tornado__key-label tornado__key-label--workers")
		.text("Workers")
		.attr("x", width/2 - 10)
		.attr("y", -20)
		.attr("text-anchor", "end");

	var housing_label = svg.append("text")
		.attr("class", "tornado__key-label tornado__key-label--housing")
		.text("Housing Units")
		.attr("x", width/2 + 10)
		.attr("y", -20)
		.attr("text-anchor", "start");
}



/*************
LINE CHART
*************/

function line(wrapper_id, margin, data, time_var, line_vars, line_labels, yTickFormat, y_axis_label) {

	/*************
	PlOT BASICS
	*************/

	var wrapper = d3.select(wrapper_id);
	var wrapper_width = wrapper.node().getBoundingClientRect().width;

	var width = wrapper_width - margin.left - margin.right,
		height = width * .6 - margin.top - margin.bottom;

	var svg = wrapper.insert("svg", ":first-child")
		.attr("class", "plot--left-axis")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


	/*************
	SCALES
	*************/

	dates_series = data.map(function(d) {return d[time_var]});

	// build data series from line_vars
	lines_series = [];

	for (var i = 0; i < line_vars.length; i++) {
	    lines_series[i] = data.map(function(d) {return parseFloat(d[line_vars[i]]); });
	}

	// concat all series to build scales
	var all_series = [].concat.apply([], lines_series);

	// build scales
	var xScale = d3.time.scale()
		.domain(d3.extent(data, function(d) { return d[time_var]; }))
	    .range([0, width]);

	var yScale = d3.scale.linear()
		.domain([
			d3.min(all_series) - d3.deviation(all_series) * .3,
			d3.max(all_series),
		])
	    .range([height, 0]);

	/*************
	AXES
	*************/

	// build axes
	var xAxis = d3.svg.axis()
	    .scale(xScale)
	    .orient("bottom")
	    .ticks(d3.time.month, 12);

	var yAxis = d3.svg.axis()
	    .scale(yScale)
	    .orient("left")
	    .ticks(Math.max(height/40, 2));

	if (yTickFormat !== null) {
		yAxis.tickFormat(yTickFormat);
	}

	var xAxisLine = svg.append("g")
		  .attr("class", "x axis")
		  .attr("transform", "translate(0," + height + ")")
		  .call(xAxis);

	var yAxisLine = svg.append("g")
		.attr("class", "y axis")
		.call(yAxis);


	if (y_axis_label !== null) {
		yAxisLine.append("text")
		.attr("class", "axis__label")
		.attr("transform", "rotate(-90)")
		.attr("y", -40)
		.attr("x", height / -2)
		.style("text-anchor", "middle")
		.text(y_axis_label)
	}


	/*************
	LINES
	*************/

	// loop over values in line_vars array
	for (var i = 0; i < line_vars.length; i++) {

		var label = line_labels[i];

		// build group
		var line_group = svg.append("g")
			.attr("class", "line__group line__group--" + makeSlug(label));

		// build lines
		var line = d3.svg.line()
			.x(function(d) {
			    return xScale(d[time_var]);
			})
			.y(function(d) {
			    return yScale(d[line_vars[i]]);
			})
			.interpolate("basis");

		// add line to group
		line_group.append("path")
			.attr("d", line(data))
			.attr("class", "line line--" + makeSlug(label) );

		// add line labels
		line_group.append("text")
			.text(label)
			.attr("x", xScale(d3.max(dates_series)) + 12)
			.attr("y", yScale(d3.max(lines_series[i])))
			.attr("class", "line__label line__label--" + makeSlug(label))
			.attr("alignment-baseline", "middle");
	}

}


/****************************************************
LOAD DATA
****************************************************/

// COUNTY-LEVEL DATA
d3.csv("assets/data/acs_county_data.csv", function(error, data) {
	if (error) throw error;

	// parse dates
	data.forEach(function(d) {
		d["acs_year"] = parseYear(d["acs_year"]);
	});

	/**** Jobs vs housing line chart ******/
	var jh_vars = ["workers_total_est", "housing_total_est"];
	var jh_labels = ["Workers", "Housing Units"];
	var jh_margin = {top: 20, right: 100, bottom: 30, left: 100};

	var jobs_housing_line = line('#jobs-housing-line', jh_margin, data, "acs_year", jh_vars, jh_labels, null, null);


	/**** Commute times line charts ****/
	var commutes_long_vars = ["commute_60plus", "commute_60plus_outbound"],
		commutes_mean_vars = ["mean_travel_time", "mean_travel_time_outbound"],
		commutes_labels = ["Workers", "Residents"],
		commutes_margin = {top: 10, right: 70, bottom: 30, left: 69};

	var commutes_mean_line = line('#commutes-mean-line', commutes_margin, data, "acs_year", commutes_mean_vars, commutes_labels, null, "Minutes");

	var commutes_long_line = line('#commutes-long-line', commutes_margin, data, "acs_year", commutes_long_vars, commutes_labels, formatPercentWhole, null);

});




// TIME-SERIES RENT DATA
d3.csv("assets/data/zillow-rents.csv", function(error, data) {
	if (error) throw error;

	// parse dates
	data.forEach(function(d) {
		d["year_month"] = parseYearMonth(d["year_month"]);
	});

	/**** rents chart ******/
	var rents_vars = ["Palo Alto", "Mountain View", "Menlo Park", "San Jose", "Redwood City", "Santa Clara", "Gilroy"];
	var rents_margin = {top: 20, right: 100, bottom: 30, left: 70};

	var rents_line = line('#rents-line', rents_margin, data, "year_month", rents_vars, rents_vars, formatDollars, null);

});








// PLACE-LEVEL DATA
d3.csv("assets/data/acs_data.csv", function(data) {

	// clean dataset
	data = data.filter(function(d){
		if(isNaN(d.zillow_2014_12) || isNaN(d.pop_change_p) || isNaN(d.med_hh_income_est) || isNaN(d.mean_travel_time_2014) ) {
			return false;
		}
		d.zillow_2014_12 = + d.zillow_2014_12;
		d.pop_change_p = +d.pop_change_p;
		d.med_hh_income_est = + d.med_hh_income_est;
		d.mean_travel_time_2014 = +d.mean_travel_time_2014;
		d.commute_60plus_2014 = +d.commute_60plus_2014;
		d.commute_60plus_2014_outbound = +d3.round(d.commute_60plus_2014_outbound * 100, 1);
		d.total_workers_2014 = +d.total_workers_2014;
		d.housing_units_est_2014 = +d.housing_units_est_2014;
		d.workers_housing_ratio_2014 = +d.workers_housing_ratio_2014;
		return true;
	});

	console.log(data[0]);

	/**** Pop growth by income scatterplot ******/

	function buildTooltip_popIncome(wrapper) {

		var tooltip = wrapper.append('div')
		.attr("class", "tooltip");

		var tt_heading = tooltip.append('h3')
				.attr('class', 'tooltip__heading');
		var tt_income = tooltip.append('p')
				.attr('class', 'tooltip__info');
		var tt_rent = tooltip.append('p')
				.attr('class', 'tooltip__info');
		var tt_pop2010 = tooltip.append('p')
				.attr('class', 'tooltip__info tooltip__info--new-section');
		var tt_pop2014 = tooltip.append('p')
				.attr('class', 'tooltip__info');
		var tt_popChange = tooltip.append('p')
				.attr('class', 'tooltip__info tooltip__info--new-section');

		return [tooltip, tt_heading, tt_income, tt_rent, tt_pop2010, tt_pop2014, tt_popChange];
	}

	function updateTooltip_popIncome(tooltip_elements, d) {

		//set tooltip values
		tooltip_elements[1].text(d['clean_name']);
		tooltip_elements[2].text('Median Household Income: ' + formatDollars(d.med_hh_income_est));
		tooltip_elements[3].text('Median Rent: ' + formatDollars(d.zillow_2014_12));
		tooltip_elements[4].text('2010 Pop. ' + commaSeparateNumber(d.pop_2010));
		tooltip_elements[5].text('2014 Pop. ' + commaSeparateNumber(d.pop_2014));
		tooltip_elements[6].text('Pop. Growth: ' + d3.round(d.pop_change_p * 100, 1) + '%');
	}

	var pop_income_cols = {'x2': "zillow_2014_12", 'x1': 'med_hh_income_est', 'y1': 'pop_change_p', 'y2': null}
	
	var pop_income_labels = {'x2': "Median Monthly Rent", 'x1':"Median Household Income", 'y1': "Population Growth", 'y2': null}

	var pop_income_axis_formats = {'x1': formatDollars, 'x2': formatDollars, 'y1': formatPercent, 'y2':null}

	var pop_income_btn_ids = {'x2': "#pop-plot-toggle-rent", 'x1': "#pop-plot-toggle-income", 'y1': null, 'y2':null}

	pop_income_scatterplot = scatterplot('#pop-rent-income-scatterplot', data, pop_income_cols, pop_income_labels, pop_income_axis_formats, pop_income_btn_ids, buildTooltip_popIncome, updateTooltip_popIncome);



	/**** Income by median commute time scatterplot ******/

	function buildTooltip_incomeCommute(wrapper) {

		var tooltip = wrapper.append('div')
		.attr("class", "tooltip");

		var tt_heading = tooltip.append('h3')
				.attr('class', 'tooltip__heading');
		var tt_income = tooltip.append('p')
				.attr('class', 'tooltip__info');
		var tt_rent = tooltip.append('p')
				.attr('class', 'tooltip__info');

		var tt_mean_commute = tooltip.append('p')
				.attr('class', 'tooltip__info tooltip__info--new-section');
		var tt_long_commute = tooltip.append('p')
				.attr('class', 'tooltip__info');

		return [tooltip, tt_heading, tt_income, tt_rent, tt_mean_commute, tt_long_commute];
	}

	function updateTooltip_incomeCommute(tooltip_elements, d) {

		//set tooltip values
		tooltip_elements[1].text(d['clean_name']);
		tooltip_elements[2].text('Median Household Income: ' + formatDollars(d.med_hh_income_est));
		tooltip_elements[3].text('Median Rent: ' + formatDollars(d.zillow_2014_12));
		tooltip_elements[4].text(formatPercentWhole(d.commute_60plus_2014) + ' of workers have 60+ min commutes');
		tooltip_elements[5].text(formatPercentWhole(d.commute_60plus_2014_outbound) + ' of residents have 60+ min commutes');
	}

	// var commute_cols = {'x1': "zillow_2014_12", 'x2': null, 'y1': 'mean_travel_time_2014', 'y2': 'commute_60plus_2014'}
	
	// var commute_labels = {'x1': "Median Monthly Rent", 'x2':null, 'y1': "Average Inbound Commute Time (Min)", 'y2': "60+ Minute Commutes"}

	// var commute_axis_formats = {'x1': formatDollars, 'x2': null, 'y1': null, 'y2': formatPercentWhole}

	// var commute_btn_ids = {'x1': null, 'x2': null, 'y1': "#commute-plot-toggle-mean", 'y2':"#commute-plot-toggle-long"}

	// var commute_scatterplot = scatterplot('#inbound-scatterplot', data, commute_cols, commute_labels, commute_axis_formats, commute_btn_ids, buildTooltip_incomeCommute, updateTooltip_incomeCommute);


	console.log(data);

	var outbound_commute_cols = {'x1': "zillow_2014_12", 'x2': null, 'y1': 'commute_60plus_2014', 'y2': 'commute_60plus_2014_outbound'}

	var outbound_commute_btn_ids = {'x1': null, 'x2': null, 'y1': "#commute-plot-toggle-inbound", 'y2':"#commute-plot-toggle-outbound"}

	var outbound_commute_axis_formats = {'x1': formatDollars, 'x2': null, 'y1': formatPercentWhole, 'y2': formatPercentWhole}

	var outbound_commute_labels = {'x1': "Median Monthly Rent", 'x2':null, 'y1': "60+ Minute Commutes", 'y2': "60+ Minute Commutes"}


	var outbound_commute_scatterplot = scatterplot('#outbound-scatterplot', data, outbound_commute_cols, outbound_commute_labels, outbound_commute_axis_formats, outbound_commute_btn_ids, buildTooltip_incomeCommute, updateTooltip_incomeCommute);

	/**** Jobs vs housing tornado chart ******/
	jobs_housing_tornado = tornado('#jobs-housing-tornado', data);
	
});