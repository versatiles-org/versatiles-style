export type LayerGroupOptions = {
	land?:
		| boolean
		| number
		| {
				forest?: boolean | number;
				vegetation?: boolean | number;
				rock?: boolean | number;
				wetland?: boolean | number;
				sand?: boolean | number;
				glacier?: boolean | number;
				agriculture?: boolean | number;
				urban?: boolean | number;
		  };
	water?:
		| boolean
		| number
		| {
				ocean?: boolean | number;
				rivers?: boolean | number;
				lakes?: boolean | number;
				piers?: boolean | number;
		  };
	roads?:
		| boolean
		| number
		| {
				motorways?: boolean | number;
				highways?: boolean | number;
				streets?:
					| boolean
					| number
					| {
							residential?: boolean | number;
							service?: boolean | number;
							pedestrian?: boolean | number;
							track?: boolean | number;
							bus?: boolean | number;
					  };
				paths?: boolean | number;
		  };
	transit?:
		| boolean
		| number
		| {
				rail?: boolean | number;
				aerialways?: boolean | number;
				ferries?: boolean | number;
				stops?: boolean | number;
		  };
	buildings?: boolean | number;
	sites?: boolean | number;
	airport?: boolean | number;
	pois?: boolean | number;
	boundaries?:
		| boolean
		| number
		| {
				country?: boolean | number;
				state?: boolean | number;
		  };
	markings?: boolean | number;
	labels?:
		| boolean
		| number
		| {
				places?: boolean | number;
				streets?: boolean | number;
				states?: boolean | number;
				countries?: boolean | number;
				addresses?: boolean | number;
		  };
	icons?: boolean | number;
};
