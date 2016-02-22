/********* 
CREDITS
- scatterplot adapted from http://bl.ocks.org/mbostock/3887118
- tooltips loosely adapted from https://bl.ocks.org/d3noob/a22c42db65eb00d4e369
*********/



// function to make numbers more readable
// from http://stackoverflow.com/questions/3883342/add-commas-to-a-number-in-jquery
function commaSeparateNumber(val) {
    while (/(\d+)(\d{3})/.test(val.toString())){
      val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
    }
    return val;
}

// function to round to a set number of decimal points
// from http://stackoverflow.com/questions/1726630/javascript-formatting-number-with-exactly-two-decimals
function roundToDigit(value, exp) {
  if (typeof exp === 'undefined' || +exp === 0)
    return Math.round(value);

  value = +value;
  exp = +exp;

  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
    return NaN;

  // Shift
  value = value.toString().split('e');
  value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));

  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
}


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
	var rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);
	
	return [slope, intercept, rSquare];
}



/*********
Pop growth by income/rent scatterplot
*********/

function drawScatterplotToggle(wrapper_id, dataset, x1_col, x2_col, y_col, x1_axis_label, x2_axis_label, y_axis_label, x1_btn_id, x2_btn_id) {
	
	
}


// load dataset
d3.csv("assets/data/acs_data.csv", function(data) {

	// clean dataset
	data = data.filter(function(d){
        if(isNaN(d.med_rent_est) || isNaN(d.pop_change_p || isNaN(d.med_hh_income_est))) {
            return false;
        }
        d.med_rent_est = + d.med_rent_est;
        d.pop_change_p = +d.pop_change_p
        d.med_hh_income_est = + d.med_hh_income_est;
        return true;
    });

    // prep pop-income scatterplot

	// dimensions
	var wrapper = d3.select('#pop-rent-income');
	var wrapper_width = wrapper.node().getBoundingClientRect().width;

	var margin = {top: 0, right: 0, bottom: 60, left: 70},
	    width = wrapper_width - margin.left - margin.right,
	    height = (width * .66) - margin.top - margin.bottom;

	var svg = wrapper.insert("svg", ":first-child")
		.attr("class", "plot--left-axis")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


	// extract values to build scales more efficiently
	med_rent_est = data.map(function(d) {return d.med_rent_est; });
	med_hh_income_est = data.map(function(d) {return d.med_hh_income_est; });
	pop_change_p = data.map(function(d) {return d.pop_change_p; });

	med_rent_est_padding = d3.deviation(med_rent_est) / 10;
	med_hh_income_est_padding = d3.deviation(med_hh_income_est) / 10;
	pop_change_p_padding = d3.deviation(pop_change_p) / 8;

	// prep scales
	var xScale_rent = d3.scale.linear()
		.domain([
			d3.min(med_rent_est) - med_rent_est_padding,
			d3.max(med_rent_est) + med_rent_est_padding
		])
	    .range([0, width]);

	var xScale_income = d3.scale.linear()
		.domain([
			d3.min(med_hh_income_est) - med_hh_income_est_padding,
			d3.max(med_hh_income_est) + med_hh_income_est_padding
		])
	    .range([0, width]);

	var yScale = d3.scale.linear()
		.domain([
			d3.min(pop_change_p) - pop_change_p_padding,
			d3.max(pop_change_p) + pop_change_p_padding
		])
	    .range([height, 0]);

	var activeXscale = xScale_rent;

	// prep axes
	var formatPercent = d3.format(".0%");

	var xAxisRent = d3.svg.axis()
	    .scale(xScale_rent)
	    .orient("bottom");

	var xAxisIncome = d3.svg.axis()
	    .scale(xScale_income)
	    .orient("bottom");

	var yAxis = d3.svg.axis()
	    .scale(yScale)
	    .orient("left")
	    .tickFormat(formatPercent);


	// build graph

	// axes
	svg.append("g")
	      .attr("class", "x axis")
	      .attr("transform", "translate(0," + height + ")")
	      .call(xAxisRent)
	    .append("text")
	      .attr("class", "axis__label")
	      .attr("x", width / 2)
	      .attr("y", 50)
	      .style("text-anchor", "middle")
	      .text("Median Monthly Rent");

	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
	  .append("text")
		.attr("class", "axis__label")
		.attr("transform", "rotate(-90)")
		.attr("y", -45)
		.attr("x", height / -2)
		.style("text-anchor", "middle")
		.text("Population Growth")

	/*************
	TRENDLINE
	*************/

	function getTrendlinePoints(xSeries, ySeries) {
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
		var scaleX1 = activeXscale(x1);
		var scaleY1 = yScale(y1);
		var scaleX2 = activeXscale(x2);
		var scaleY2 = yScale(y2);

		return [scaleX1, scaleY1, scaleX2, scaleY2];
	}

	function plotTrendline(xSeries, ySeries) {
		
		trendPoints = getTrendlinePoints(xSeries, ySeries);
		
		var trendline = svg.append("line")
			.attr("class", "trendline")
			.attr("x1", trendPoints[0])
			.attr("y1", trendPoints[1])
			.attr("x2", trendPoints[2])
			.attr("y2", trendPoints[3]);

		return trendline;
	}

	var trendline = plotTrendline(med_rent_est, pop_change_p);

	/*************
	DATA POINTS
	*************/

	var points = svg.selectAll(".dot")
	    .data(data)
	  .enter().append("circle")
		.attr("class", "dot")
		.attr("r", 4.5)
		.attr("cx", function(d) { return xScale_rent(d.med_rent_est); })
		.attr("cy", function(d) { return yScale(d.pop_change_p); });

	/*************
	TOOLTIP
	*************/

	// build tooltip
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


	function mouseoverHandler(d, i) {

		// select which x var to use as axis
		raw_x_val = null;

		if (activeXscale == xScale_rent) {
			raw_x_val = d.med_rent_est;
		} else if (activeXscale == xScale_income) {
			raw_x_val = d.med_hh_income_est;
		}

		// get positions for tooltip
		xPos = Math.round(activeXscale(raw_x_val) + margin.left/2 + 9);
		yPos = Math.round(yScale(d.pop_change_p));

		// move tooltip
		tooltip.style('opacity', 1)
			.style('z-index', 10)
			.style("left", xPos + "px")
			.style("top", yPos + "px");

		//set tooltip values
		tt_heading.text(d['GEO.display.label.x']);
		tt_income.text('Median Household Income: $' + commaSeparateNumber(d.med_hh_income_est));
		tt_rent.text('Median Rent: $' + commaSeparateNumber(d.med_rent_est));
		tt_pop2010.text('2010 Pop. ' + commaSeparateNumber(d.pop_2010));
		tt_pop2014.text('2014 Pop. ' + commaSeparateNumber(d.pop_2014));
		tt_popChange.text('Pop. Growth: ' + roundToDigit(d.pop_change_p * 100, 1) + '%');
	}

	function mouseoutHandler(d,i) {
		tooltip.style('opacity', 0)
			.style('z-index', -1);
	}

	points.on("mouseover", mouseoverHandler)
		.on("mouseout", mouseoutHandler);

	/*************
	TOGGLE GRAPH
	*************/

	// toggle graph based on button clicks
	d3.select('#pop-plot-toggle-rent').on("click", function() {

		// set active xScale to use in tooltips
		activeXscale = xScale_rent;

		// toggle selected classes
		d3.select(this).classed("plot-toggle__btn--selected", true);
		d3.select("#pop-plot-toggle-income").classed("plot-toggle__btn--selected", false);

		// change trendline
		trendPoints = getTrendlinePoints(med_rent_est, pop_change_p);
		trendline.transition()
			.duration(1000)
			.attr("x1", trendPoints[0])
			.attr("y1", trendPoints[1])
			.attr("x2", trendPoints[2])
			.attr("y2", trendPoints[3]);

		// move points
		points.transition()
		.duration(1000)
		.attr("cx", function(d) { return xScale_rent(d.med_rent_est); });

		// change x axis
		d3.select('g.x.axis')
			.transition()
			.duration(500)
			.call(xAxisRent)
			.select('text.axis__label')
				.text("Median Monthly Rent");
	});



	d3.select('#pop-plot-toggle-income').on("click", function() {

		// set active xScale to use in tooltips
		activeXscale = xScale_income;

		// toggle selected classes
		d3.select(this).classed("plot-toggle__btn--selected", true);
		d3.select("#pop-plot-toggle-rent").classed("plot-toggle__btn--selected", false);

		// change trendline
		trendPoints = getTrendlinePoints(med_hh_income_est, pop_change_p);
		trendline.transition()
			.duration(1000)
			.attr("x1", trendPoints[0])
			.attr("y1", trendPoints[1])
			.attr("x2", trendPoints[2])
			.attr("y2", trendPoints[3]);

		// move points
		points.transition()
		.duration(1000)
		.attr("cx", function(d) { return xScale_income(d.med_hh_income_est); });

		// change x axis
		d3.select('g.x.axis')
			.transition()
			.duration(500)
			.call(xAxisIncome)
			.select('text.axis__label')
				.text("Median Household Income");
	});


	
});




