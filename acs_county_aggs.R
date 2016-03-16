library(plyr)
library(dplyr)
library(ggplot2)
library(reshape2)
library(rowr)

setwd("~//Documents/School/Stanford/Classes/Data Journalism Two/housing-commutes-story/sv-housing-commutes")


#######################################################################################

# LOAD AND CLEAN DATA

#######################################################################################


###########
# HOUSING GROWTH
###########

years_studied <- seq(10, 14, 1)

acs_counties_housing <- list()

for (i in 1:length(years_studied)) {

	year <- years_studied[i]

	# read in data
	csv_path <- paste("data/acs_counties_housing/ACS_", year, "_1YR_B25001/ACS_", year, "_1YR_B25001.csv", sep="")
	data <- read.csv(csv_path)
	data$acs_year <- paste("20",year, sep="")

	# subset to CDPs in SV
	acs_counties_housing[[i]] <- data
	
}

acs_counties_housing_all <- as.data.frame(rbind_all(acs_counties_housing))

acs_counties_housing_all <- rename(acs_counties_housing_all, housing_est=HD01_VD01, housing_moe=HD02_VD01)

acs_counties_housing_all

# combine counties
housing_totals <- ddply(acs_counties_housing_all, .(acs_year), summarise,
	housing_total_est = sum(housing_est),
	housing_total_moe = sum(housing_moe))


###########
# WORKERS GROWTH
###########


acs_counties_workers <- list()

for (i in 1:length(years_studied)) {

	year <- years_studied[i]

	# read in data
	csv_path <- paste("data/acs_counties_inbound_commutes/ACS_", year, "_1YR_S0804/ACS_", year, "_1YR_S0804.csv", sep="")
	data <- read.csv(csv_path, skip=1, header=TRUE)
	data$acs_year <- paste("20",year, sep="")

	# subset to CDPs in SV
	acs_counties_workers[[i]] <- data
	
}

acs_counties_workers_all <- as.data.frame(rbind_all(acs_counties_workers))

colnames(acs_counties_workers_all)

head(acs_counties_workers_all)

# acs_counties_housing_all <- rename(acs_counties_housing_all, housing_est=HD01_VD01, housing_moe=HD02_VD01)

colnames(acs_counties_workers_all)

# combine counties
worker_totals <- ddply(acs_counties_workers_all, .(acs_year), summarise,
	workers_total_est = sum(as.numeric(Total..Estimate..Workers.16.years.and.over)),
	workers_total_moe = sum(as.numeric(Total..Margin.of.Error..Workers.16.years.and.over)))

worker_totals


#########
# INBOUND COMMUTE TIMES
#########

# code commutes over 30 min
acs_counties_workers_all$commute_30plus <- acs_counties_workers_all$Total..Estimate..TRAVEL.TIME.TO.WORK...30.to.34.minutes + acs_counties_workers_all$Total..Estimate..TRAVEL.TIME.TO.WORK...35.to.44.minutes + acs_counties_workers_all$Total..Estimate..TRAVEL.TIME.TO.WORK...45.to.59.minutes + acs_counties_workers_all$Total..Estimate..TRAVEL.TIME.TO.WORK...60.or.more.minutes

inbound_commutes_aggs <- ddply(acs_counties_workers_all, .(acs_year), summarise, 
	mean_travel_time = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...Mean.travel.time.to.work..minutes.),
	commute_under10 = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...Less.than.10.minutes),
	commute_10to14 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...10.to.14.minutes),
	commute_15to19 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...15.to.19.minutes),
	commute_20to24 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...20.to.24.minutes),
	commute_25to29 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...25.to.29.minutes),
	commute_30to34 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...30.to.34.minutes),
	commute_35to44 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...35.to.44.minutes),
	commute_45to59 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...45.to.59.minutes),
	commute_60plus = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...60.or.more.minutes),
	commute_10to14_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...10.to.14.minutes),
	commute_15to19_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...15.to.19.minutes),
	commute_20to24_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...20.to.24.minutes),
	commute_25to29_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...25.to.29.minutes),
	commute_30to34_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...30.to.34.minutes),
	commute_35to44_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...35.to.44.minutes),
	commute_45to59_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...45.to.59.minutes),
	commute_60plus_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...60.or.more.minutes),
	commute_30plus = mean(commute_30plus))


# bin categories
inbound_commutes_aggs$commute_under_20 <- inbound_commutes_aggs$commute_under10 + inbound_commutes_aggs$commute_10to14 + inbound_commutes_aggs$commute_15to19

inbound_commutes_aggs$commute_20to34 <- inbound_commutes_aggs$commute_20to24 + inbound_commutes_aggs$commute_25to29 + inbound_commutes_aggs$commute_30to34

inbound_commutes_aggs$commute_35to60 <- inbound_commutes_aggs$commute_30to34 + inbound_commutes_aggs$commute_35to44 + inbound_commutes_aggs$commute_45to59

inbound_commutes_aggs


#########
# OUTBOUND COMMUTE TIMES
#########


outbound_commutes <- list()

for (i in 1:length(years_studied)) {

	year <- years_studied[i]

	# read in data
	csv_path <- paste("data/acs_counties_outbound_commutes/ACS_", year, "_1YR_S0801/ACS_", year, "_1YR_S0801.csv", sep="")
	data <- read.csv(csv_path, skip=1, header=TRUE)
	data$acs_year <- paste("20",year, sep="")

	# subset to CDPs in SV
	outbound_commutes[[i]] <- data
	
}

outbound_commutes_all <- as.data.frame(rbind_all(outbound_commutes))


outbound_commutes_aggs <- ddply(outbound_commutes_all, .(acs_year), summarise, 
	mean_travel_time = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...Mean.travel.time.to.work..minutes.),
	commute_under10 = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...Less.than.10.minutes),
	commute_10to14 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...10.to.14.minutes),
	commute_15to19 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...15.to.19.minutes),
	commute_20to24 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...20.to.24.minutes),
	commute_25to29 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...25.to.29.minutes),
	commute_30to34 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...30.to.34.minutes),
	commute_35to44 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...35.to.44.minutes),
	commute_45to59 = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...45.to.59.minutes),
	commute_60plus = mean(Total..Estimate..TRAVEL.TIME.TO.WORK...60.or.more.minutes),
	commute_mean_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...Mean.travel.time.to.work..minutes.),
	commute_10to14_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...10.to.14.minutes),
	commute_15to19_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...15.to.19.minutes),
	commute_20to24_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...20.to.24.minutes),
	commute_25to29_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...25.to.29.minutes),
	commute_30to34_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...30.to.34.minutes),
	commute_35to44_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...35.to.44.minutes),
	commute_45to59_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...45.to.59.minutes),
	commute_60plus_moe = mean(Total..Margin.of.Error..TRAVEL.TIME.TO.WORK...60.or.more.minutes))

# add outbound to colnames
colnames(outbound_commutes_aggs)[2:ncol(outbound_commutes_aggs)] <- paste(colnames(outbound_commutes_aggs)[2:ncol(outbound_commutes_aggs)], "outbound", sep = "_")

outbound_commutes_aggs


#######################################################################################

# MERGE DFs

#######################################################################################

# merge dfs together
counties_housing_workers <- merge(housing_totals, worker_totals, by="acs_year")
counties_housing_workers_commutes <- merge(counties_housing_workers, inbound_commutes_aggs, by="acs_year")
counties_housing_workers_commutes <- merge(counties_housing_workers_commutes, outbound_commutes_aggs, by="acs_year")

counties_housing_workers_commutes

## write to CSV
write.csv(file="web/assets/data/acs_county_data.csv", x=counties_housing_workers_commutes, row.names=F)


