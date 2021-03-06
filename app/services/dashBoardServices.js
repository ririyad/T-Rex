(function () {
	'use strcit';

	app.factory('dashboardFactory', dashboardFactory);

	function dashboardFactory($http, $q, $window, $interval, timeAgo, restCall, queryService, ngAuthSettings){
		
		var getUserNameList = function (getUsersUrl) {
			var deferred = $q.defer();		
			$http.get(getUsersUrl).success(function (response) {			
				deferred.resolve(response);
			}).error(function (error) {
				deferred.reject(error);
			});
			return deferred.promise;
		}

		var getDeliveryType = function (value) {		
			if (!value.hasOwnProperty("Order")) {			
				return "";
			}
			if (value.Order.Type === "ClassifiedDelivery" && value.Order.Variant === "default") {
				return "B2B + Cash Delivery";
			} 
			if (value.Order.Type === "ClassifiedDelivery" && value.Order.Variant === "Enterprise" && value.User.UserName === "B2C") {
				return "B2C Delivery"
			} 
			if (value.Order.Type === "ClassifiedDelivery" && value.Order.Variant === "Enterprise") {
				return "B2B Delivery";
			} 
			if (value.Order.Type === "Delivery") {			
				return "B2B Delivery";
			} 
			return "Delivery"		
		}

		var checkHRStateString = function (job) {
			var hrStateString = job.HRState.includes("Enqueued")? job.HRState.replace("Enqueued", "Pending"): job.HRState;
			job.HRState = hrStateString;
			return job;
		}

		var addSingleJobOnList = function (job) {
			job = checkHRStateString(job);
			return {
				data: job,					
				Type :  function(){
					if (job.Order.Type === "ClassifiedDelivery" && job.Order.Variant === "default") {
						return "B2B + Cash Delivery";
					} else if (job.Order.Type === "ClassifiedDelivery" && job.Order.Variant === "Enterprise") {
						return "B2B Delivery";
					}
				},
				selected: false,			
				
				isAssigningPickUpAsset : false,
				isAssigningDeliveryAsset : false,
				isAssigningReturnDeliveryAsset : false,
				isAssigningSecureCashDeliveryAsset : false,

				isCompletingPickUpAsset : false,
				isCompletingDeliveryAsset : false,
				isCompletingReturnDeliveryAsset : false,
				isCompletingSecureCashDeliveryAsset : false,
				
				isUpdatingPaymentStatus: false,				
				ETA : function () {
					var eta = "";
					if (job.Order.ETA) {
						eta += "ETA : " + new Date(job.Order.ETA).toUTCString("EEE MMM d, y h:mm:ss a") + " *** ";
					}
					if (job.Order.JobTaskETAPreference) {
						angular.forEach(job.Order.JobTaskETAPreference, function (etaTime, index) {								
							eta += etaTime.Type + " : " + new Date(etaTime.ETA).toUTCString("EEE MMM d, y h:mm:ss a") + " *** ";
						});
					}
					return eta;
				},
				PackageDescription: function () {
					var description = "";
					angular.forEach(job.Order.OrderCart.PackageList, function (item, index) {
						description += item.Item + "\n";
					});
					return description;
				},					
				RequestedAgo : timeAgo(job.ModifiedTime)
			}
		}

		var populateOrdersTable = function(Orders, jobListUrl){
			function successCallback(response){
				Orders.data = [];
				Orders.pages = [];
				Orders.isCompleted = 'SUCCESSFULL';
				var orders = response.data;
				if (orders.data && orders.data.length == 0) {
					Orders.isCompleted = 'EMPTY';
				}
				if (response.data.pagination) {				
					Orders.pagination = response.data.pagination;
				}
				angular.forEach(orders.data, function(value, key){
					var newOrder = addSingleJobOnList(value);
					Orders.data.push(newOrder);
				});
				if (orders.pagination.TotalPages > 1) {
					for (var i = 0; i < orders.pagination.TotalPages ; i++) {
						var page = {
							pageNo : i,
							isCurrentPage : ""
						}
						if (orders.pagination.Page === i) {
							page.isCurrentPage = "selected-page"; // current page css class set on pagination list item
						}
						if (i > (orders.pagination.Page - 5) && i < (orders.pagination.Page + 5)) {
							Orders.pages.push(page);	
						}					
					};	
				}
				
				Orders.total = orders.pagination.Total;
	 		};
	 		function errorCallback(response) {
	 			 Orders.isCompleted = 'FAILED';
	 		}

	 		// Orders.data = [];
			// Orders.pages = [];
			// Orders.isCompleted = 'IN_PROGRESS';
	 		restCall('GET', jobListUrl, null, successCallback, errorCallback);
		};

		var getProperWordWithCss = function (word) {
			if (word == "ENQUEUED" || word == "PENDING" || word == "Pending") {
				return {
					value: "PENDING",
					class: "pending"
				};
			}
			else if (word == "IN_PROGRESS") {
				return {
					value: "IN PROGRESS",
					class: "in-progress"
				}
			}
			else if (word == "COMPLETED") {
				return {
					value: "COMPLETED",
					class: "completed"
				}
			}
			else if (word == "CANCELLED") {
				return {
					value: "CANCELLED",
					class: "cancelled"
				}
			}
			else if (word == "USER") {
				return {
					value: "B2C",
					class: "b2c"
				}
			}
			else if (word == "ENTERPRISE") {
				return {
					value: "B2B",
					class: "b2b"
				}
			}
			else if (word == "BIKE_MESSENGER") {
				return {
					value: "Asset",
					class: "b2c"
				}
			}
			else if (word == "Paid") {
				return {
					value: "PAID",
					class: "completed"
				}
			}
			return {
				value: "N/A",
				class: "not-applicable"
			};
		}

		// the isCompleted value of the orders has 4 states IN_PROGRESS, SUCCESSFULL, EMPTY, FAILED
		// these states indicates the http request's state and content of the page
		var orders = function (jobState) {
			return {
				data: [],
				pagination: null,
				pages:[],
				total: 0, 
				isCompleted : '',			
				searchParam : {
					type: "Job",
					userId : null,
					UserName : null,
					CreateTime : {
						startDate : null,
						endDate : null,
					},
					CompletionTime : {
						startDate : null,
						endDate : null,
					},
					ModifiedTime : {
						startDate : null,
						endDate : null,
					},
					DeliveryArea: null,
					PickupArea: null,
					PaymentStatus: null,
					jobState : jobState,
					orderby : {
						property : "CreateTime",
						orderbyCondition : "desc"
					},
					subStringOf : {
						SearchKey : null,					
					},
					AttemptCount: null,
					envelope: true,
					page: 0,
					pageSize: 50,
					countOnly: false
				},
				errMsg: null,
				selectedAssetName: null,
				selectedJobsIndexes: {},
				selectAll: false,
				selectedJobsCount: 0,
				selectJob: function (index) {				
					if (this.selectedJobsIndexes[index]) {					
						delete this.selectedJobsIndexes[index];
						this.data[index].selected = false;
					} else {
						this.selectedJobsIndexes[index] = this.data[index].data.HRID;
						this.data[index].selected = true;
					}
					this.selectedJobsCount = Object.keys(this.selectedJobsIndexes).length;				
				},
				clearSelectedJobs : function () {
					var itSelf = this;
					var tempHRIDlist = itSelf.selectedJobsIndexes;
					angular.forEach(tempHRIDlist, function (HRID, index) {
						itSelf.selectJob(index);
					})				
					itSelf.selectAll = false;
				},
				selectAllJobs : function () {
					var itSelf = this;
					if (itSelf.selectAll) {
						if(!angular.equals({}, itSelf.selectedJobsIndexes)){
							angular.forEach(itSelf.data, function (data, index) {
								if (!itSelf.selectedJobsIndexes[index]) {
									itSelf.selectJob(index);							
								}
							})					
						} else {
							angular.forEach(itSelf.data, function (data, index) {
								itSelf.selectJob(index);
							});
						}					
					} else {
						itSelf.clearSelectedJobs()
					}					
				},
				getProperWordWithCss : function (word) {
					return getProperWordWithCss(word);
				},
				loadOrders: function () {				
					var pageUrl = "";
					// if there is an searchParam.userId, it means We need to load assigned jobs of an asset				
					if (this.searchParam.userId) {
						pageUrl = ngAuthSettings.apiServiceBaseUri + "api/job/odata?$filter=(Tasks/any(task: task/State eq 'IN_PROGRESS' and Task/Type eq 'Delivery' and task/AssetRef eq '"+ this.searchParam.userId +"'))&pageSize="+ this.searchParam.pageSize +"&page="+ this.searchParam.page +"&sortDirection=Descending";
					} else {
						pageUrl = queryService.getOdataQuery(this.searchParam);
					}
					populateOrdersTable(this, pageUrl);
				},
				loadListOfOrders: function (HRIDList) {
					this.data = [];
					var itSelf = this;					
					angular.forEach(HRIDList, function (HRID, key) {
						HRID = HRID.includes('Job-') ? HRID : "Job-" + HRID;
						itSelf.loadSingleOrder(HRID);
					});
				},
				loadSingleOrder: function (HRID) {
					var itSelf = this;
					this.isCompleted = 'IN_PROGRESS';
					$http({
						method: 'GET',
						url: ngAuthSettings.apiServiceBaseUri + "api/Job/" + HRID
					}).then(function (response) {
						var newOrder = addSingleJobOnList(response.data);
						itSelf.data.push(newOrder);
						itSelf.isCompleted = 'SUCCESSFULL';
						document.getElementById("bulk-assign-job-chips").focus();
					}, function (error) {
						itSelf.isCompleted = 'SUCCESSFULL'; // Since I dont want to block UI with Just server error message
															// Rather show them which job couldn't be loaded						
						itSelf.errMsg = (itSelf.errMsg)? itSelf.errMsg : [];						
						itSelf.errMsg.push(HRID);
						document.getElementById("bulk-assign-job-chips").focus();
					});
				},
				loadSingleTask: function (taskTypeOrName, orderIndex, variant) {
					var itSelf = this;
					var task = {};
					var Tasks = itSelf.data[orderIndex].data.Tasks;
					for(var i = 0; i < Tasks.length; i++){
						if (Tasks[i].Name === taskTypeOrName || Tasks[i].Type === taskTypeOrName) {							
							if (variant && Tasks[i].Variant === variant) {
								task = Tasks[i];								
							} else {
								task = Tasks[i];
							}
						}
					}					
					return task;
				},
				loadPage: function (pageNo) {
					this.isCompleted = 'IN_PROGRESS';		
					this.searchParam.page = pageNo;				
					this.loadOrders();			
				},
				loadPrevPage: function () {
					this.isCompleted = 'IN_PROGRESS';
					console.log(this);
					console.log(this.pagination.PrevPage);
					if (this.pagination.PrevPage) {
						populateOrdersTable(this, this.pagination.PrevPage);
					}
				},
				loadNextPage: function () {
					this.isCompleted = 'IN_PROGRESS';
					console.log(this);
					console.log(this.pagination.NextPage);
					if (this.pagination.NextPage) {
						populateOrdersTable(this, this.pagination.NextPage);
					}
				},
				assign: {
					showPickupAssign: false,
					showdeliveryAssign: false,
					showReturnDeliveryAssign: false,
					showsecuredeliveryAssign: false,
					assetRef: null				
				},
				showPaymentUpdateOption: false,
				updatePaymentStatus: function (jobindex) {
		 			var itSelf = this;	 			
		 			itSelf.data[jobindex].isUpdatingPaymentStatus = true;
		 			$http({
		 				method: 'POST',
		 				url: ngAuthSettings.apiServiceBaseUri + 'api/payment/process/' + itSelf.data[jobindex].data.Id,
		 			}).then(function(response){		 				
		 				itSelf.data[jobindex].isUpdatingPaymentStatus = false;
		 				var jobUrl = ngAuthSettings.apiServiceBaseUri + "api/job/" + itSelf.data[jobindex].data.HRID;
						$http({
							method: "GET",
							url: jobUrl
						}).then(function (response) {
							itSelf.data[jobindex].data = response.data;							
						}, function (error) {					
							console.log(error);							
						})
		 			}, function (error) {		 				
		 				itSelf.data[jobindex].isUpdatingPaymentStatus = false;
		 			})
		 		},
				patchToTask: function(orderIndex, assetAssignUrl, value) {
					var itSelf = this;
					var jobUrl = ngAuthSettings.apiServiceBaseUri + "api/job/" + itSelf.data[orderIndex].data.HRID;
					function isAssigningCompleted (){						
						itSelf.data[orderIndex].isAssigningPickUpAsset = false;
						itSelf.data[orderIndex].isAssigningDeliveryAsset = false;
						itSelf.data[orderIndex].isAssigningReturnDeliveryAsset = false;
						itSelf.data[orderIndex].isAssigningSecureCashDeliveryAsset = false;

						itSelf.data[orderIndex].isCompletingPickUpAsset = false;
						itSelf.data[orderIndex].isCompletingDeliveryAsset = false;
						itSelf.data[orderIndex].isCompletingReturnDeliveryAsset = false;
						itSelf.data[orderIndex].isCompletingSecureCashDeliveryAsset = false;
					}
					$http({
						method: "PATCH",
						url: assetAssignUrl,
						data: value
					}).then(function (response) {
						$http({
							method: "GET",
							url: jobUrl
						}).then(function (response) {
							itSelf.data[orderIndex].data = response.data;
							isAssigningCompleted();
						}, function (error) {					
							console.log(error);
							isAssigningCompleted();
						})
						isAssigningCompleted();
					}, function (error) {
						console.log(error);
						isAssigningCompleted();
					})
				},
				assignAssetToTask: function (orderIndex, task, patchType) {
					var itSelf = this;				
					var value = [];
					var assetAssignUrl = ngAuthSettings.apiServiceBaseUri + "api/job/" + itSelf.data[orderIndex].data.Id + "/" + task.id;
					if (patchType === 'AssetAssign') {
						value = [
							{value: this.assign.assetRef, path: "/AssetRef", op: "replace"}, 
							{value: "IN_PROGRESS", path: "/State", op: "replace"}
						];
						itSelf.patchToTask(orderIndex, assetAssignUrl, value);
					}
					if (patchType === 'TaskComplete'){
						value = [{value: "COMPLETED", path: "/State", op: "replace"}];
						itSelf.patchToTask(orderIndex, assetAssignUrl, value);

						if (task.Type === 'PackagePickUp') {
							assetAssignUrl = ngAuthSettings.apiServiceBaseUri + "api/job/" + itSelf.data[orderIndex].data.Id + "/" + itSelf.data[orderIndex].data.Tasks[0].id;
							value = [{value: "COMPLETED", path: "/State", op: "replace"}];
							itSelf.patchToTask(orderIndex, assetAssignUrl, value);
						}
					}
				}
			}
		};


		var autoRefresh;
		var startRefresh = function (Orders) {
			if (angular.isDefined(autoRefresh)) return;
			autoRefresh = $interval(function () {			
				Orders.loadOrders();	
			}, 60000);
		}
		

		var stopRefresh = function () {
			if (angular.isDefined(autoRefresh)) {			
				$interval.cancel(autoRefresh);
				autoRefresh = undefined;
			}
		}

		var getIsoDate = function (date, hour, min, sec) {
			return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, min, sec).toISOString();
		}

		return {
			getUserNameList : getUserNameList,
			populateOrdersTable : populateOrdersTable,		
			orders: orders,
			startRefresh: startRefresh,
			stopRefresh: stopRefresh,
			getProperWordWithCss: getProperWordWithCss,
			getIsoDate: getIsoDate,
			getDeliveryType: getDeliveryType
		};
	}
})();
