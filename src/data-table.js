/**
## Data Table Widget

Includes: [Base Mixin](#base-mixin)

The data table is a simple widget designed to list crossfilter focused data set (rows being
filtered) in a good old tabular fashion.

Examples:
* [Nasdaq 100 Index](http://dc-js.github.com/dc.js/)

#### dc.dataTable(parent[, chartGroup])
Create a data table widget instance and attach it to the given parent element.

Parameters:
* parent : string | node | selection - any valid
 [d3 single selector](https://github.com/mbostock/d3/wiki/Selections#selecting-elements) specifying
 a dom block element such as a div; or a dom element or d3 selection.

* chartGroup : string (optional) - name of the chart group this chart instance should be placed in.
 Interaction with a chart will only trigger events and redraws within the chart's group.

Returns:
A newly created data table widget instance

**/
dc.dataTable = function(parent, chartGroup) {
    var LABEL_CSS_CLASS = "dc-table-label";
    var ROW_CSS_CLASS = "dc-table-row";
    var COLUMN_CSS_CLASS = "dc-table-column";
    var GROUP_CSS_CLASS = "dc-table-group";
    var HEAD_CSS_CLASS = "dc-table-head";
    var TD_CLICKED_CLASS = "dc-table-td-clicked";

    var _chart = dc.baseMixin({});

    var _isShowGroup = true;
    var _size = 25;
    var _columns = [];
    var _sortBy = function(d) {
        return d;
    };
    var _order = d3.ascending;

    var _onCategoryClick = function(data){};

    _chart._doRender = function() {
        _chart.selectAll("thead").remove();
        _chart.selectAll("tbody").remove();

        renderRows(renderGroups());

        return _chart;
    };

    function renderGroups() {
        // inject thead
        var tHead = _chart.root().append("thead")
            .attr("class", HEAD_CSS_CLASS)
            .style("width", _chart.width());
        var headTh = tHead.selectAll("th")
            .data(_columns);

        // calc agg width
        var aggWidth = 0;
        _columns.forEach(function(columnOption,i) {
            aggWidth += columnOption.width || 100;
        });

        headTh.enter()
            .append("th")
            .style("width", function(d){
                var sizeInPcnt = (d.width || 100) / aggWidth;
                var actualSize = Math.floor(sizeInPcnt * _chart.width());
                return actualSize + "px";
            })
            .html(function(d){return d.title || d.key;});

        var groups = _chart.root().selectAll("tbody")
            .data(nestEntries(), function(d) {
                return _chart.keyAccessor()(d);
            });

        var rowGroup = groups
            .enter()
            .append("tbody")
            .style("width", _chart.width());


        var rowGroupTr = rowGroup
            .append("tr")
            .attr("class", GROUP_CSS_CLASS);
        if (!_isShowGroup) {
            rowGroupTr.style("display", "none");
        }

        rowGroupTr.append("td")
            .attr("class", LABEL_CSS_CLASS)
            .attr("colspan", _columns.length)
            .html(function(d) {
                return _chart.keyAccessor()(d);
            });

        groups.exit().remove();

        return rowGroup;
    }

    function nestEntries() {
        var entries = _chart.dimension().top(_size);

        return d3.nest()
            .key(_chart.group())
            .sortKeys(_order)
            .entries(entries.sort(function(a, b){
                return _order(_sortBy(a), _sortBy(b));
            }));
    }

    function renderRows(groups) {
        var rows = groups.order()
            .selectAll("tr." + ROW_CSS_CLASS)
            .data(function(d) {
                return d.values;
            });

        var rowEnter = rows.enter()
            .append("tr")
            .attr("class", ROW_CSS_CLASS);

        // calc agg width
        var aggWidth = 0;
        _columns.forEach(function(columnOption,i) {
            aggWidth += columnOption.width || 100;
        });

        _columns.forEach(function(columnOption,i) {
            var sizeInPcnt = (columnOption.width || 100) / aggWidth;
            var actualSize = Math.floor(sizeInPcnt * _chart.width());
            var rowTd = rowEnter.append("td");
            rowTd.attr("class", COLUMN_CSS_CLASS + " _" + i)
                .style("width", actualSize + "px")
                .html(function(d){
                    // inject formatter
                    var cellValue = d[columnOption.key];
                    var cellFormat;
                    if (columnOption.dataType && columnOption.dataType == "date") {
                        cellFormat = d3.time.format(columnOption.dataFormat || "%B %d, %Y %H:%M");
                        if (columnOption.needTranslate)
                            cellValue = new Date(cellValue * 1000);
                        return cellFormat(cellValue);
                    } else if (columnOption.dataType && columnOption.dataType == "number" && columnOption.dataFormat) {
                        cellFormat = d3.format(columnOption.dataFormat);
                        return cellFormat(cellValue);
                    }
                    return cellValue;
                });
            if (columnOption.type && columnOption.type == 'c') {
                rowTd.classed("category", true);
                rowTd.on("click", function(d){
//                    console.log("td cliked");
//                    console.log(d3.select(this));
                    var clickedCell = d3.select(this);
                    var clickedRow = d3.select(this.parentNode);

                    // clear all click style
                    var pTable = d3.select(this.parentNode.parentNode.parentNode);
                    pTable.selectAll("." + TD_CLICKED_CLASS).classed(TD_CLICKED_CLASS, false);

                    // apply cell style
                    var allClass = clickedCell.attr('class').split(" ");
                    if (allClass.indexOf(TD_CLICKED_CLASS) < 0) {
                        // not clicked
                        clickedCell.classed(TD_CLICKED_CLASS, true);
                        clickedRow.classed(TD_CLICKED_CLASS, true);
                        columnOption._isApply = true;
                    } else {
                        clickedCell.classed(TD_CLICKED_CLASS, false);
                        clickedRow.classed(TD_CLICKED_CLASS, false);
                        columnOption._isApply = false;
                    }

                    _onCategoryClick(d, columnOption, _chart.dimension().top(Infinity));
                });
            }
        });

        rows.exit().remove();

        return rows;
    }

    _chart._doRedraw = function() {
        return _chart._doRender();
    };

    /**
    #### .showGroup(boolean)
    set to show or hide group row
    **/
    _chart.showGroup = function(isShow) {
        if (!arguments.length) return _isShowGroup;
        _isShowGroup = isShow;
        return _chart;
    };

    _chart.setCategoryClick = function(f) {
        if (!arguments.length) return _chart;
        _onCategoryClick = f;
        return _chart;
    };

    /**
    #### .size([size])
    Get or set the table size which determines the number of rows displayed by the widget.

    **/
    _chart.size = function(s) {
        if (!arguments.length) return _size;
        _size = s;
        return _chart;
    };

    /**
    #### .columns([columnFunctionArray])
    Get or set column functions. The data table widget uses an array of functions to generate dynamic
    columns. Column functions are simple javascript functions with only one input argument d which
    represents a row in the data set, and the return value of these functions will be used directly
    to generate table content for the cells.

    ```js
        chart.columns([
            function(d) {
                return d.date;
            },
            function(d) {
                return d.open;
            },
            function(d) {
                return d.close;
            },
            function(d) {
                return numberFormat(d.close - d.open);
            },
            function(d) {
                return d.volume;
            }
        ]);
    ```

    **/
    _chart.columns = function(_) {
        if (!arguments.length) return _columns;
        _columns = _;
        return _chart;
    };

    /**
    #### .sortBy([sortByFunction])
    Get or set sort-by function. This function works as a value accessor at row level and returns a
    particular field to be sorted by. Default value: identity function

    ```js
       chart.sortBy(function(d) {
            return d.date;
        });
    ```

    **/
    _chart.sortBy = function(_) {
        if (!arguments.length) return _sortBy;
        _sortBy = _;
        return _chart;
    };

    /**
    #### .order([order])
    Get or set sort order. Default value: ``` d3.ascending ```

    ```js
        chart.order(d3.descending);
    ```

    **/
    _chart.order = function(_) {
        if (!arguments.length) return _order;
        _order = _;
        return _chart;
    };

    return _chart.anchor(parent, chartGroup);
};