library(plyr)
library(dplyr)
library(ggplot2)
library(reshape2)
library(rowr)

setwd("~//Documents/School/Stanford/Classes/Data Journalism Two/housing-commutes-story")


#######################################################################################

# LOAD AND CLEAN DATA

#######################################################################################


# get list of CDPs in San Mateo and Santa Clara counties
# sv_cdp_list <- read.csv("data/SV_CDPs.csv")

# # get expanded list of CDPs around SV - nvrmind, numbers seem weird
# sv_cdp_list <- read.csv("data/SV_CDPs_expanded.csv")

# with zillow data
sv_cdp_list <- read.csv("data/SV_CDPs_zillow.csv")


###########
# OUTBOUND TRAVEL TIME
###########

# travel time data
travel_time_df <- read.csv("data/ACS_travel_time/ACS_14_5YR_B08303/ACS_14_5YR_B08303.csv")

# subset to CDPS in SV
tt_sv <- subset(travel_time_df, subset=GEO.id2 %in% sv_cdp_list$geoid)

head(tt_sv)


# code 60+ min commutes
tt_sv$travel_60plus_n <- tt_sv$HD01_VD12 + tt_sv$HD01_VD13
tt_sv$commute_60plus_2014_outbound <- tt_sv$travel_60plus_n / tt_sv$HD01_VD01

# create subset to merge
outbound_commutes <- subset(tt_sv, select=c(GEO.id2, commute_60plus_2014_outbound))

outbound_commutes


###########
# MEDIAN RENT AS SHARE OF HH INCOME
###########

median_rent_income_share_df <- read.csv("data/ACS_median_ris/ACS_14_5YR_B25071/ACS_14_5YR_B25071.csv")

# subset to CDPS in SV
mris_sv <- subset(median_rent_income_share_df, subset=GEO.id2 %in% sv_cdp_list$geoid)

mris_sv <- rename(mris_sv, mris_est=HD01_VD01, ris_moe=HD02_VD01)

# mris_sv



###########
# MEDIAN HH INCOME
###########

median_hh_income <- read.csv("data/ACS_median_income/ACS_14_5YR_B19013/ACS_14_5YR_B19013.csv")

# subset to CDPS in SV
mhh_income_sv <- subset(median_hh_income, subset=GEO.id2 %in% sv_cdp_list$geoid)

# rename columns
mhh_income_sv <- rename(mhh_income_sv, med_hh_income_est=HD01_VD01, med_hh_income_moe=HD02_VD01)

# mhh_income_sv


###########
# MEDIAN RENT
###########

median_rent_df <- read.csv("data/ACS_median_rent/ACS_14_5YR_B25064/ACS_14_5YR_B25064.csv")

# subset to CDPS in SV
rent_sv <- subset(median_rent_df, subset=GEO.id2 %in% sv_cdp_list$geoid)
rent_sv <- rename(rent_sv, med_rent_est=HD01_VD01, med_rent_moe=HD02_VD01)

# sort df
rent_sv[order(rent_sv$med_rent_est),]


# rent_sv



###########
# POPULATION GROWTH
###########

# NOTE: Had to use 5-year rolling average, undercounts pop growth (though trend should be the same)

years_studied <- seq(10, 14, 1)

acs_data_5yr <- list()

for (i in 1:length(years_studied)) {

	year <- years_studied[i]

	# read in data
	csv_path <- paste("data/ACS_ttw_yearly_5yr/ACS_", year, "_5YR_B08303/ACS_", year, "_5YR_B08303.csv", sep="")
	data <- read.csv(csv_path)
	data$acs_year <- paste("20",year, sep="")

	# subset to CDPs in SV
	acs_data_5yr[[i]] <- subset(data, subset=GEO.id2 %in% sv_cdp_list$geoid)
	
}

acs_all_5yr <- as.data.frame(rbind_all(acs_data_5yr))

pop_workers_by_year_5yr <- subset(acs_all_5yr, select=c("GEO.id2", "GEO.display.label", "HD01_VD01", "acs_year"))

# pop_workers_by_year_5yr


## compute pop growth

places <- unique(pop_workers_by_year_5yr$GEO.display.label)

ids <- vector(length=length(places))
pop_growth_p <- vector(length=length(places))
pop_growth_n <- vector(length=length(places))
pop_2010 <- vector(length=length(places))
pop_2011 <- vector(length=length(places))
pop_2012 <- vector(length=length(places))
pop_2013 <- vector(length=length(places))
pop_2014 <- vector(length=length(places))

for (i in 1:length(places)) {

	place <- places[i]
	ids[i] <- pop_workers_by_year_5yr[pop_workers_by_year_5yr$GEO.display.label == place,]$GEO.id2

	print(place)
	print(ids[i])

	place_df <- pop_workers_by_year_5yr[pop_workers_by_year_5yr$GEO.display.label==place,]

	pop_2010[i] <- place_df$HD01_VD01[place_df$acs_year==2010]
	pop_2011[i] <- place_df$HD01_VD01[place_df$acs_year==2011]
	pop_2012[i] <- place_df$HD01_VD01[place_df$acs_year==2012]
	pop_2013[i] <- place_df$HD01_VD01[place_df$acs_year==2013]
	pop_2014[i] <- place_df$HD01_VD01[place_df$acs_year==2014]
	pop_growth_p[i] = (pop_2014[i] - pop_2010[i]) / pop_2010[i]
	pop_growth_n[i] = pop_2014[i] - pop_2010[i]

}

pop_growth_df <- data.frame(GEO.display.label=places, 
	GEO.id2 = ids,
	pop_2010 = pop_2010,
	pop_2011 = pop_2011,
	pop_2012 = pop_2012,
	pop_2013 = pop_2013,
	pop_2014 = pop_2014,
	pop_change_p=pop_growth_p,
	pop_change_n=pop_growth_n)

# pop_growth_df



###########
# INBOUND COMMUTES 1 YEAR
###########

# inbound_commutes_1_yrly <- list()

# for (i in 1:length(years_studied)) {

# 	year <- years_studied[i]

# 	# read in data
# 	csv_path <- paste("data/ACS_inbound_commute_time/ACS_", year, "_1YR_S0804/ACS_", year, "_1YR_S0804.csv", sep="")
# 	data <- read.csv(csv_path, skip=1, header=TRUE)
# 	data$acs_year <- paste("20",year, sep="")

# 	# subset to CDPs in SV
# 	inbound_commutes_1_yrly[[i]] <- subset(data, subset=Id2 %in% sv_cdp_list$geoid)
	
# }

# inbound_commutes_all_1yr <- rbind.fill(inbound_commutes_1_yrly)




###########
# INBOUND COMMUTES 5 YEAR
###########

# probably under-counts trend b/c 5 year averages

########### EXTRACT DATA FROM INDIVIDUAL CSVs #############

inbound_commutes_yrly <- list()

for (i in 1:length(years_studied)) {

	year <- years_studied[i]

	# read in data
	csv_path <- paste("data/ACS_inbound_commute_time/ACS_", year, "_5YR_S0804/ACS_", year, "_5YR_S0804.csv", sep="")
	data <- read.csv(csv_path, skip=1, header=TRUE)
	data$acs_year <- paste("20",year, sep="")

	# subset to CDPs in SV
	inbound_commutes_yrly[[i]] <- subset(data, subset=Id2 %in% sv_cdp_list$geoid)
	
}

# combine datasets
inbound_commutes_all <- rbind.fill(inbound_commutes_yrly)

# colnames(inbound_commutes_all)

######## Clean and reshape into long df

# code commutes over 30 min
inbound_commutes_all$commute_30plus <- inbound_commutes_all$Total..Estimate..TRAVEL.TIME.TO.WORK...30.to.34.minutes + inbound_commutes_all$Total..Estimate..TRAVEL.TIME.TO.WORK...35.to.44.minutes + inbound_commutes_all$Total..Estimate..TRAVEL.TIME.TO.WORK...45.to.59.minutes + inbound_commutes_all$Total..Estimate..TRAVEL.TIME.TO.WORK...60.or.more.minutes

# reshape dataset
inbound_commutes_aggs <- ddply(inbound_commutes_all, .(acs_year, Geography), summarise, 
	GEO.id2 = Id2,
	total_workers = Total..Estimate..Workers.16.years.and.over,
	total_workers_moe = Total..Margin.of.Error..Workers.16.years.and.over,
	mean_travel_time = Total..Estimate..TRAVEL.TIME.TO.WORK...Mean.travel.time.to.work..minutes.,
	commute_under10 = Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...Less.than.10.minutes,
	commute_10to14 = Total..Estimate..TRAVEL.TIME.TO.WORK...10.to.14.minutes,
	commute_15to19 = Total..Estimate..TRAVEL.TIME.TO.WORK...15.to.19.minutes,
	commute_20to24 = Total..Estimate..TRAVEL.TIME.TO.WORK...20.to.24.minutes,
	commute_25to29 = Total..Estimate..TRAVEL.TIME.TO.WORK...25.to.29.minutes,
	commute_30to34 = Total..Estimate..TRAVEL.TIME.TO.WORK...30.to.34.minutes,
	commute_35to44 = Total..Estimate..TRAVEL.TIME.TO.WORK...35.to.44.minutes,
	commute_45to59 = Total..Estimate..TRAVEL.TIME.TO.WORK...45.to.59.minutes,
	commute_60plus = Total..Estimate..TRAVEL.TIME.TO.WORK...60.or.more.minutes,
	commute_10to14_moe = Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...10.to.14.minutes,
	commute_15to19_moe = Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...15.to.19.minutes,
	commute_20to24_moe = Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...20.to.24.minutes,
	commute_25to29_moe = Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...25.to.29.minutes,
	commute_30to34_moe = Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...30.to.34.minutes,
	commute_35to44_moe = Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...35.to.44.minutes,
	commute_45to59_moe = Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...45.to.59.minutes,
	commute_60plus_moe = Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...60.or.more.minutes,
	commute_30plus = commute_30plus)

# inbound_commutes_aggs

# str(inbound_commutes_aggs)

###### REFORMAT AS LONG SO CAN MERGE INTO COMBINDED DF
inbound_commutes_aggs_by_year <- list()

for (i in 1:length(years_studied)) {

	# subset to year
	year <- paste("20", years_studied[i], sep="")
	year_data <- subset(inbound_commutes_aggs, acs_year == year)

	# add year to colnames
	colnames(year_data)[4:ncol(year_data)] <- paste(colnames(year_data)[4:ncol(year_data)], year, sep = "_")

	# sort by geography just to be safe during merge
	year_data <- year_data[order(year_data$Geography),]

	# add to list
	inbound_commutes_aggs_by_year[[i]] <- year_data
}

# merge into one wide df
inbound_commutes_wide <- do.call(cbind, inbound_commutes_aggs_by_year)

# remove duplicate columns
inbound_commutes_wide <- inbound_commutes_wide[!duplicated(lapply(inbound_commutes_wide, summary))]




###########
# HOUSING UNITS
###########


########### EXTRACT DATA FROM INDIVIDUAL CSVs #############

housing_units_yrly <- list()

for (i in 1:length(years_studied)) {

	year <- years_studied[i]

	# read in data
	csv_path <- paste("data/ACS_housing_units/ACS_", year, "_5YR_B25001/ACS_", year, "_5YR_B25001.csv", sep="")
	data <- read.csv(csv_path)
	data$acs_year <- paste("20",year, sep="")

	# subset to CDPs in SV
	housing_units_yrly[[i]] <- subset(data, subset=GEO.id2 %in% sv_cdp_list$geoid)
}

# combine datasets
housing_units_all <- rbind.fill(housing_units_yrly)

# change colnames
colnames(housing_units_all) <- c("GEO.id", "GEO.id2", "GEO.display.label", "housing_units_est", "housing_units_moe", "acs_year")


###### REFORMAT AS LONG SO CAN MERGE INTO COMBINDED DF
housing_units_by_year <- list()

for (i in 1:length(years_studied)) {

	# subset to year
	year <- paste("20", years_studied[i], sep="")
	year_data <- subset(housing_units_all, acs_year == year)

	# remove acs_year var
	year_data$acs_year <- NULL

	# add year to colnames
	colnames(year_data)[4:ncol(year_data)] <- paste(colnames(year_data)[4:ncol(year_data)], year, sep = "_")

	# sort by geography just to be safe during merge
	year_data <- year_data[order(year_data$GEO.display.label),]

	# add to list
	housing_units_by_year[[i]] <- year_data
}

# merge into one wide df
housing_units_wide <- do.call(cbind, housing_units_by_year)

# remove duplicate columns
housing_units_wide <- housing_units_wide[!duplicated(lapply(housing_units_wide, summary))]

head(housing_units_wide)





###########
# ZILLOW RENT DATA
###########

rents_city <- read.csv("data/Zillow/City_Zri_MultiFamilyResidenceRental.csv")

# subset to sv places
rents_sv_cities <- subset(rents_city, RegionID %in% sv_cdp_list$zillow_id, select=-c(SizeRank, State, Metro, CountyName))

# merge with sv_cdp_list to get GEO.IDs
rents_with_ids <- merge(sv_cdp_list, rents_sv_cities, by.x="zillow_id", by.y="RegionID")

# remove some columns
rents_with_ids <- subset(rents_with_ids, select=-c(zillow_id, formatted_place, RegionName))

# add zillow to colnames
colnames(rents_with_ids)[2:ncol(rents_with_ids)] <- paste('zillow', colnames(rents_with_ids)[2:ncol(rents_with_ids)], sep = "_")

# remove X from colnames
colnames(rents_with_ids) <- gsub("X", "", colnames(rents_with_ids))

# replace . with _ in colnames
colnames(rents_with_ids) <- gsub("\\.", "_", colnames(rents_with_ids))

# remove trend data after 2014 for consistency (ish - through jan 2015 worked better)
rents_with_ids <- rents_with_ids[,1:52]

colnames(rents_with_ids)

########### reformat df to work better as d3 time series
t(rents_with_ids)



#######################################################################################

# MERGE DFs

#######################################################################################

# merge dfs together
mris_income_sv <- merge(mris_sv, mhh_income_sv, by="GEO.id2")
rents_df <- merge(mris_income_sv, rent_sv, by="GEO.id2")

# remove duplicates before next step
rents_df <- rents_df[!duplicated(lapply(rents_df, summary))]

rents_etc_inbound <- merge(rents_df, inbound_commutes_wide, by="GEO.id2")
rents_etc_housing <- merge(rents_etc_inbound, housing_units_wide, by="GEO.id2")

# remove duplicates before next step
rents_etc_housing <- rents_etc_housing[!duplicated(lapply(rents_etc_housing, summary))]

full_df <- merge(rents_etc_housing, pop_growth_df, by="GEO.id2")
full_df <- merge(full_df, rents_with_ids, by.x="GEO.id2", by.y="geoid")
full_df <- merge(full_df, outbound_commutes, by="GEO.id2")

##### clean full_df

# remove duplicates
full_df <- full_df[!duplicated(lapply(full_df, summary))]

# remove cols added by merging
full_df$GEO.id.x <- full_df$GEO.display.label.x <- full_df$acs_year <- NULL

colnames(full_df)




#######################################################################################

# ADD METRICS FROM ACROSS DATASETS

#######################################################################################

# clean version of the place name
full_df$clean_name <- gsub("\\s\\w+, California$", "", full_df$GEO.display.label, perl = TRUE)

# workers-housing ratios
full_df$workers_housing_ratio_2014 <- full_df$total_workers_2014 / full_df$housing_units_est_2014
full_df$workers_housing_ratio_2013 <- full_df$total_workers_2013 / full_df$housing_units_est_2013
full_df$workers_housing_ratio_2012 <- full_df$total_workers_2012 / full_df$housing_units_est_2012
full_df$workers_housing_ratio_2011 <- full_df$total_workers_2011 / full_df$housing_units_est_2011
full_df$workers_housing_ratio_2010 <- full_df$total_workers_2010 / full_df$housing_units_est_2010





## write to CSV
write.csv(file="web/assets/data/acs_data.csv", x=full_df, row.names=F)



colnames(full_df)




#######################################################################################

# REFORMAT ZILLOW DATA FOR D3 TIME SERIES

#######################################################################################

# subset to zillow data
zillow_ts <- subset(full_df, select=c(zillow_2010_11:clean_name))

# clean colnames
colnames(zillow_ts) <- gsub("zillow_", "", colnames(zillow_ts))

# add places as rownames
rownames(zillow_ts) <- zillow_ts$clean_name
# remove clean_name from df
zillow_ts$clean_name <- NULL

# transpose df
zillow_ts <- t(zillow_ts)

# write to csv
write.csv(file="web/assets/data/zillow-rents.csv", x=zillow_ts, row.names=T)















#######################################################################################
#######################################################################################
#######################################################################################

# ANALYSIS

#######################################################################################
#######################################################################################
#######################################################################################



######### PLOTS #############

# mean travel times changes by place
ggplot(data=inbound_commutes_aggs, 
	aes(x=acs_year, y=mean_travel_time, group = Geography, colour = Geography)) +
    geom_line()


# long travel times changes by place
ggplot(data=inbound_commutes_aggs, 
	aes(x=acs_year, y=commute_30plus, group = Geography, colour = Geography)) +
    geom_line()


###### COMMUTE TIME BREAKDOWNS

# see how commute times have changed
mean_commute_time_breakdown <- ddply(inbound_commutes_aggs, .(acs_year), summarise,
	mean_commute_under10 = mean(commute_under10, na.rm=T),
	mean_commute_10to14 = mean(commute_10to14, na.rm=T),
	mean_commute_15to19 = mean(commute_15to19, na.rm=T),
	mean_commute_20to24 = mean(commute_20to24, na.rm=T),
	mean_commute_25to29 = mean(commute_25to29, na.rm=T),
	mean_commute_30to34 = mean(commute_30to34, na.rm=T),
	mean_commute_35to44 = mean(commute_35to44, na.rm=T),
	mean_commute_45to59 = mean(commute_45to59, na.rm=T),
	mean_commute_60plus = mean(commute_60plus, na.rm=T))

mean_commute_time_breakdown <- melt(mean_commute_time_breakdown, id.vars='acs_year')
mean_commute_time_breakdown

ggplot(mean_commute_time_breakdown, aes(acs_year, value)) +   
  geom_bar(aes(fill = variable), position = "dodge", stat="identity") +
  theme_bw()

# key difference - growth in 60 plus min commutes


#### look at commute time breakdown by place

# loop through places
par(ask=TRUE) # pause on each

for (place in unique(inbound_commutes_aggs$Geography)) {

	# subset to place, remove unwanted columns (think about bringing back error margins later)
	city_data <- subset(inbound_commutes_aggs, Geography==place, select=c(acs_year, commute_under10, commute_10to14, commute_15to19, commute_20to24, commute_25to29, commute_30to34, commute_35to44, commute_45to59, commute_60plus))

	# melt data for ggplot
	city_data <- melt(city_data, id.vars='acs_year')
	city_data

	# plot
	print( ggplot(city_data, aes(acs_year, value)) +   
		geom_bar(aes(fill = variable), position = "dodge", stat="identity") +
		ggtitle(place) + 
		theme_bw())
}



`%notin%` <- function(x,y) !(x %in% y) 

# exclude places that are too small, throwing off analysis
working_df <- subset(full_df, GEO.display.label.x %notin% c("Portola Valley town, California", "Woodside town, California", "Brisbane city, California"))


income_commute <- ddply(working_df, .(GEO.display.label.x), summarise, 
		med_hh_income_est = med_hh_income_est,
		pop_change_p = pop_change_p,
		mean_commute_time = HC01_EST_VC112,
		commute_30plus = commute_30plus)


# temp generate file to build d3 stuff with
# TODO subset this to just needed columns
# write.csv(file="web/assets/data/acs_data.csv", x=working_df, row.names=F)


#### POP CHANGE BY RENT

ggplot(working_df, 
	aes(med_rent_est, pop_change_p, label=GEO.display.label.x)) + 
	geom_text(check_overlap = TRUE) + 
	ylim(-0.01, 0.12) + 
	geom_smooth(method = "lm", se = FALSE)


#### POP CHANGE BY INCOME

ggplot(working_df, 
	aes(med_hh_income_est, pop_change_p, label=GEO.display.label.x)) + 
	geom_text(check_overlap = TRUE) + 
	ylim(-0.01, 0.12) + 
	geom_smooth(method = "lm", se = FALSE)


#### 30 PLUS MIN COMMUTES BY INCOME

ggplot(working_df, 
	aes(med_hh_income_est, commute_30plus, label=GEO.display.label.x)) + 
	geom_text(check_overlap = TRUE) + 
	geom_smooth(method = "lm", se = FALSE)


#### MEAN COMMUTES BY INCOME

ggplot(working_df, 
	aes(med_hh_income_est, HC01_EST_VC112, label=GEO.display.label.x)) + 
	geom_text(check_overlap = TRUE) + 
	geom_smooth(method = "lm", se = FALSE)

#### 30 PLUS MIN COMMUTES BY RENT

ggplot(working_df, 
	aes(med_rent_est, commute_30plus, label=GEO.display.label.x)) + 
	geom_text(check_overlap = TRUE) + 
	geom_smooth(method = "lm", se = FALSE)


#### MEAN COMMUTES BY RENT

ggplot(working_df, 
	aes(med_rent_est, HC01_EST_VC112, label=GEO.display.label.x)) + 
	geom_text(check_overlap = TRUE) + 
	geom_smooth(method = "lm", se = FALSE)


# plot(income_commute$commute_30plus ~ income_commute$med_hh_income_est, xlim=c(50000, 150000))

# plot(income_commute$mean_commute_time ~ income_commute$med_hh_income_est, xlim=c(50000, 150000))

# abline(lm(income_commute$mean_commute_time ~ income_commute$med_hh_income_est), col="red")


# plot(income_commute$commute_30plus_p ~ income_commute$pop_change_p)

# plot(income_commute$mean_commute_time ~ income_commute$pop_change_p,
# 	xlim=c(-0.01, 0.1))


full_df$pop_change_p


#### REGRESSION ANALYSIS
cor(x=income_commute$pop_change_p,
	y=income_commute$mean_commute_time, 
	use="complete")


model <- lm(pop_change_p ~ med_hh_income_est, data=income_commute)

model <- lm(mean_commute_time ~ med_hh_income_est, data=income_commute)
summary(model)

