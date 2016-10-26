(function () {
	"use strict";

	// The actual plugin constructor
	var Searchtools = function(element, options) {
		var defaults = {
			// Form options
			formSelector            : '.js-stools-form',

			// Search
			searchFieldSelector     : '.js-stools-field-search',
			clearBtnSelector        : '.js-stools-btn-clear',

			// Global container
			mainContainerSelector   : '.js-stools',

			// Filter fields
			searchBtnSelector       : '.js-stools-btn-search',
			filterBtnSelector       : '.js-stools-btn-filter',
			filterContainerSelector : '.js-stools-container-filters',
			filtersHidden           : true,

			// List fields
			listBtnSelector         : '.js-stools-btn-list',
			listContainerSelector   : '.js-stools-container-list',
			listHidden              : true,

			// Ordering specific
			orderColumnSelector     : '.js-stools-column-order',
			orderBtnSelector        : '.js-stools-btn-order',
			orderFieldSelector      : '.js-stools-field-order',
			orderFieldName          : 'list[fullordering]',
			limitFieldSelector      : '.js-stools-field-limit',
			defaultLimit            : 20,

			activeOrder             : null,
			activeDirection         : 'ASC',

			// Extra
			chosenSupport           : false,
			clearListOptions        : false
		};

		this.element = element;
		this.options = Joomla.extend(defaults, options);

		// Initialise selectors
		this.theForm        = document.querySelector(this.options.formSelector);

		// Filters
		this.filterButton    = document.querySelector(this.options.formSelector + ' ' + this.options.filterBtnSelector);
		this.filterContainer = document.querySelector(this.options.formSelector + ' ' + this.options.filterContainerSelector);
		this.filtersHidden   = this.options.filtersHidden;

		// List fields
		this.listButton    = document.querySelector(this.options.listBtnSelector);
		this.listContainer = document.querySelector(this.options.formSelector + ' ' + this.options.listContainerSelector);
		this.listHidden    = this.options.listHidden;

		// Main container
		this.mainContainer = document.querySelector(this.options.mainContainerSelector);

		// Search
		this.searchButton = document.querySelector(this.options.formSelector + ' ' + this.options.searchBtnSelector);
		this.searchField  = document.querySelector(this.options.formSelector + ' ' + this.options.searchFieldSelector);
		this.searchString = null;
		this.clearButton  = document.querySelector(this.options.clearBtnSelector);

		// Ordering
		this.orderCols  = Array.prototype.slice.call(document.querySelectorAll(this.options.formSelector + ' ' + this.options.orderColumnSelector));
		this.orderField = document.querySelector(this.options.formSelector + ' ' + this.options.orderFieldSelector);

		// Limit
		this.limitField = document.querySelector(this.options.formSelector + ' ' + this.options.limitFieldSelector);

		// Init trackers
		this.activeColumn    = null;
		this.activeDirection = this.options.activeDirection;
		this.activeOrder     = this.options.activeOrder;
		this.activeLimit     = null;

		// Extra options
		this.chosenSupport    = this.options.chosenSupport;
		this.clearListOptions = this.options.clearListOptions;

		this.init();
	};

	Searchtools.prototype = {
		init: function () {
			var self = this;

			// IE < 9 - Avoid to submit placeholder value
			if(!document.addEventListener  ) {
				if (this.searchField.value === this.searchField.getAttribute('placeholder')) {
					this.searchField.value = '';
				}
			}

			// Get values
			this.searchString = this.searchField.value;

			if (this.filtersHidden) {
				this.hideFilters();
			} else {
				this.showFilters();
			}

			if (this.listHidden) {
				this.hideList();
			} else {
				this.showList();
			}

			self.filterButton.addEventListener('click', function(e) {
				self.toggleFilters();
				e.stopPropagation();
				e.preventDefault();
			});

			if (self.listButton) {
				self.listButton.addEventListener('click', function(e) {
					self.toggleList();
					e.stopPropagation();
					e.preventDefault();
				});
			}

			// Do we need to add to mark filter as enabled?
			self.getFilterFields().forEach(function(i, element) {
				self.checkFilter(i);
				i.addEventListener('change', function () {
					self.checkFilter(i);
				});
			});

			self.clearButton.addEventListener('click', function(e) {
				self.clear();
			});

			// Check/create ordering field
			this.createOrderField();

			self.orderCols.forEach(function(item) {
				item.addEventListener('click', function () {

					// Order to set
					var newOrderCol = this.getAttribute('data-order');
					var newDirection = this.getAttribute('data-direction');
					var newOrdering = newOrderCol + ' ' + newDirection;

					// The data-order attrib is required
					if (newOrderCol.length) {
						self.activeColumn = newOrderCol;

						if (newOrdering !== self.activeOrder) {
							self.activeDirection = newDirection;
							self.activeOrder = newOrdering;

							// Update the order field
							self.updateFieldValue(self.orderField, newOrdering);
						}
						else {
							self.toggleDirection();
						}

						self.theForm.submit();
					}

				});
			});
		},
		checkFilter: function (element) {
			var self = this;
			var option = element.querySelector('option:checked');
			if (option.value !== '') {
				self.activeFilter(element);
			} else {
				self.deactiveFilter(element);
			}
		},
		clear: function () {
			var self = this;

			self.getFilterFields().forEach(function(i, element) {
				i.value = '';
				self.checkFilter(i);

				if (self.chosenSupport) {
					jQuery(i).trigger('liszt:updated');
				}
			});

			if (self.clearListOptions) {
				self.getListFields().forEach(function(i, element) {
					i.value = '';
					self.checkFilter(i);

					if (self.chosenSupport) {
						jQuery(i).trigger('liszt:updated');
					}
				});

				// Special case to limit box to the default config limit
				document.querySelector('#list_limit').value = self.options.defaultLimit;

				if (self.chosenSupport) {
					jQuery('#list_limit').trigger('liszt:updated');
				}
			}

			self.theForm.submit();
		},
		activeFilter: function (element) {
			var self = this;

			element.classList.add('active');
			var chosenId = '#' + element.getAttribute('id') + '_chzn';
			var tmpEl = element.querySelector(chosenId);
			if (tmpEl) {
				tmpEl.classList.add('active');
			}
		},
		deactiveFilter: function (element) {
			element.classList.remove('active');
			var chosenId = '#' + element.getAttribute('id') + '_chzn';
			var tmpEl = element.querySelector(chosenId);
			if (tmpEl) {
				tmpEl.classList.remove('active');
			}
		},
		getFilterFields: function () {
			return Array.prototype.slice.call(this.filterContainer.querySelectorAll('select,input'));
		},
		getListFields: function () {
			return Array.prototype.slice.call(this.listContainer.querySelectorAll('select'));
		},
		// Common container functions
		hideContainer: function (container) {
			container.style.display = 'none';
			container.classList.remove('shown');
		},
		showContainer: function (container) {
			container.style.display = 'block';
			container.classList.add('shown');
		},
		toggleContainer: function (container) {
			if (container.classList.contains('shown')) {
				this.hideContainer(container);
			} else {
				this.showContainer(container);
			}
		},
		// List container management
		hideList: function () {
			this.hideContainer(this.filterContainer);
		},
		showList: function () {
			this.showContainer(this.filterContainer);
		},
		toggleList: function () {
			this.toggleContainer(this.filterContainer);
		},
		// Filters container management
		hideFilters: function () {
			this.hideContainer(this.filterContainer);
		},
		showFilters: function () {
			this.showContainer(this.filterContainer);
		},
		toggleFilters: function () {
			this.toggleContainer(this.filterContainer);
		},
		toggleDirection: function () {
			var self = this;

			var newDirection = 'ASC';

			if (self.activeDirection.toUpperCase() == 'ASC')
			{
				newDirection = 'DESC';
			}

			self.activeDirection = newDirection;
			self.activeOrder  = self.activeColumn + ' ' + newDirection;

			self.updateFieldValue(self.orderField, self.activeOrder);
		},
		createOrderField: function () {

			var self = this;

			if (!this.orderField.length)
			{
				this.orderField = createElement('<input>');
				this.orderField.setAttribute('type', 'hidden');
				this.orderField.setAttribute('id', 'js-stools-field-order');
				this.orderField.setAttribute('class', 'js-stools-field-order');
				this.orderField.setAttribute('name', self.options.orderFieldName);
				this.orderField.setAttribute('value', self.activeOrder + ' ' + this.activeDirection);

				this.theForm.innerHTML+= this.orderField;
			}

			// Add missing columns to the order select
			if (this.orderField.tagName.toLowerCase() == 'select')
			{
				var allOptions = this.orderField.options;
				for (var i = 0, l = allOptions.length; l>i; i++) {

					var value     = allOptions[i].getAttribute('data-order');
					var name      = allOptions[i].getAttribute('data-name');
					var direction = allOptions[i].getAttribute('data-direction');

					if (value && value.length)
					{
						value = value + ' ' + direction;

						var $option = self.findOption(self.orderField, value);

						if (!$option.length)
						{
							var $option = document.createElement('option');
							$option.text = name;
							$option.value = value;

							// If it is the active option select it
							if (allOptions[i].classList.contains('active'))
							{
								$option.setAttribute('selected', 'selected');
							}

							// Append the option an repopulate the chosen field
							self.orderFieldName.innerHTML += $option;
						}
					}
				}

				if (self.chosenSupport) {
					jQuery(this.orderField).trigger('liszt:updated');
				}
			}

			this.activeOrder  = this.orderField.value;
		},
		updateFieldValue: function (field, newValue) {

			var self = this,
				type = field.getAttribute('type');

			if (type === 'hidden' || type === 'text')
			{
				field.setAttribute('value', newValue);
			}
			else if (field.tagName.toLowerCase() === 'select')
			{
				// Select the option result
				var allOptions = field.options;
				for (var i = 0, l = allOptions.length; l>i; i++) {
					if (allOptions[i].value == newValue) {
						var desiredOption = allOptions[i];
					}
				}

				if (desiredOption.length)
				{
					desiredOption.setAttribute('selected', 'selected');
				}
				// If the option does not exist create it on the fly
				else
				{
					var option = document.createElement('option');
					option.text = name;
					option.value = newValue;
					option.setAttribute('selected','selected');

					// Append the option an repopulate the chosen field
					field.appendChild(option);
				}

				field.value = newValue;
				// Trigger the chosen update
				if (self.chosenSupport) {
					field.trigger('liszt:updated');
				}
			}
		},
		findOption: function(select, value) {
			for (var i = 0, l = select.length; l>i; i++) {
				if (select[i].value == value) {
					return select[i];
				}
			}
		}
	};

	// Execute on DOM Loaded Event
	document.addEventListener('DOMContentLoaded', function(){
		if (Joomla.getOptions('searchtools')) {
			var options = Joomla.getOptions('searchtools'),
				element = document.querySelector(options.selector);

			new Searchtools(element, options);
		}
	});

})();
