/**
 * @name data.championPatch
 * @namespace Name, Role, Role, Attack, Defense, Ability, Difficulty, Tracking Number (hid)
 */
define([], function () {
    "use strict";

    var championPatch;

// http://leagueoflegends.wikia.com/wiki/List_of_champions

// direct copy and past of champ rankings with corresponding role
//http://champion.gg/statistics/#?sortBy=general.overallPosition&order=ascend
    // Name, Role, Role, Attack, Defense, Ability, Difficulty, Tracking Number (hid)
    // championPatch = [
	
	// 		["ADC","Ashe",	62	],
	// 		["ADC","Caitlyn",	30	],
	// 		["ADC","Corki",	13	],
	// 		["ADC","Draven",	33	],
	// 		["ADC","Ezreal",	10	],
	// 		["ADC","Graves",	39	],
	// 		["ADC","Jinx",	2	],
	// 		["ADC","Kalista",	78	],
	// 		["ADC","Kog'Maw",	83	],
	// 		["ADC","Lucian",	60	],
	// 		["ADC","Miss Fortune",	68	],
	// 		["ADC","Quinn",	88	],
	// 		["ADC","Sivir",	23	],
	// 		["ADC","Tristana",	53	],
	// 		["ADC","Twitch",	73	],
	// 		["ADC","Urgot",	92	],
	// 		["ADC","Varus",	43	],
	// 		["ADC","Vayne",	17	],
	// 		["ADC","Mordekaiser",	46	],
	// 		["Jungle","Aatrox",	115	],
	// 		["Jungle","Amumu",	29	],
	// 		["Jungle","Diana",	9	],
	// 		["Jungle","Dr. Mundo",	166	],
	// 		["Jungle","Ekko",	55	],
	// 		["Jungle","Elise",	71	],
	// 		["Jungle","Evelynn",	25	],
	// 		["Jungle","Fizz",	103	],
	// 		["Jungle","Gragas",	150	],
	// 		["Jungle","Hecarim",	85	],
	// 		["Jungle","Jarvan IV",	163	],
	// 		["Jungle","Jax",	108	],
	// 		["Jungle","Kayle",	36	],
	// 		["Jungle","Kha'Zix",	107	],
	// 		["Jungle","Lee Sin",	119	],
	// 		["Jungle","Malphite",	160	],
	// 		["Jungle","Maokai",	174	],
	// 		["Jungle","Master Yi",	20	],
	// 		["Jungle","Nautilus",	168	],
	// 		["Jungle","Nidalee",	89	],
	// 		["Jungle","Nocturne",	56	],
	// 		["Jungle","Nunu",	153	],
	// 		["Jungle","Olaf",	137	],
	// 		["Jungle","Pantheon",	149	],
	// 		["Jungle","Poppy",	144	],
	// 		["Jungle","Rammus",	130	],
	// 		["Jungle","Rek'Sai",	127	],
	// 		["Jungle","Rengar",	50	],
	// 		["Jungle","Sejuani",	124	],
	// 		["Jungle","Shaco",	79	],
	// 		["Jungle","Shyvana",	3	],
	// 		["Jungle","Sion",	172	],
	// 		["Jungle","Skarner",	31	],
	// 		["Jungle","Tahm Kench",	96	],
	// 		["Jungle","Trundle",	138	],
	// 		["Jungle","Tryndamere",	132	],
	// 		["Jungle","Udyr",	67	],
	// 		["Jungle","Vi",	94	],
	// 		["Jungle","Volibear",	121	],
	// 		["Jungle","Warwick",	42	],
	// 		["Jungle","Wukong",	65	],
	// 		["Jungle","Xin Zhao",	11	],
	// 		["Jungle","Zac",	157	],
	// 		["Jungle","Fiddlesticks",	143	],
	// 		["Middle","Ahri",	8	],
	// 		["Middle","Akali",	170	],
	// 		["Middle","Anivia",	21	],
	// 		["Middle","Annie",	18	],
	// 		["Middle","Azir",	162	],
	// 		["Middle","Brand",	81	],
	// 		["Middle","Cassiopeia",	173	],
	// 		["Middle","Cho'Gath",	48	],
	// 		["Middle","Diana",	86	],
	// 		["Middle","Ekko",	151	],
	// 		["Middle","Fizz",	114	],
	// 		["Middle","Galio",	131	],
	// 		["Middle","Jayce",	125	],
	// 		["Middle","Karma",	156	],
	// 		["Middle","Karthus",	102	],
	// 		["Middle","Kassadin",	165	],
	// 		["Middle","Katarina",	64	],
	// 		["Middle","Kayle",	136	],
	// 		["Middle","Kennen",	148	],
	// 		["Middle","Kog'Maw",	91	],
	// 		["Middle","LeBlanc",	109	],
	// 		["Middle","Lissandra",	139	],
	// 		["Middle","Lulu",	159	],
	// 		["Middle","Lux",	4	],
	// 		["Middle","Malzahar",	27	],
	// 		["Middle","Morgana",	75	],
	// 		["Middle","Orianna",	141	],
	// 		["Middle","Ryze",	177	],
	// 		["Middle","Swain",	106	],
	// 		["Middle","Syndra",	134	],
	// 		["Middle","Talon",	34	],
	// 		["Middle","Twisted Fate",	44	],
	// 		["Middle","Urgot",	175	],
	// 		["Middle","Varus",	116	],
	// 		["Middle","Veigar",	15	],
	// 		["Middle","Vel'Koz",	51	],
	// 		["Middle","Viktor",	66	],
	// 		["Middle","Vladimir",	128	],
	// 		["Middle","Xerath",	77	],
	// 		["Middle","Yasuo",	58	],
	// 		["Middle","Zed",	38	],
	// 		["Middle","Ziggs",	98	],
	// 		["Middle","Zilean",	154	],
	// 		["Middle","Zyra",	146	],
	// 		["Middle","Heimerdinger",	122	],
	// 		["Support","Alistar",	69	],
	// 		["Support","Annie",	84	],
	// 		["Support","Bard",	35	],
	// 		["Support","Blitzcrank",	5	],
	// 		["Support","Brand",	59	],
	// 		["Support","Braum",	47	],
	// 		["Support","Galio",	110	],
	// 		["Support","Janna",	7	],
	// 		["Support","Karma",	99	],
	// 		["Support","Kennen",	105	],
	// 		["Support","Leona",	45	],
	// 		["Support","Lulu",	76	],
	// 		["Support","Morgana",	16	],
	// 		["Support","Nami",	24	],
	// 		["Support","Nautilus",	72	],
	// 		["Support","Nunu",	117	],
	// 		["Support","Sona",	26	],
	// 		["Support","Soraka",	12	],
	// 		["Support","Tahm Kench",	93	],
	// 		["Support","Taric",	101	],
	// 		["Support","Thresh",	52	],
	// 		["Support","Vel'Koz",	87	],
	// 		["Support","Zilean",	40	],
	// 		["Support","Zyra",	63	],
	// 		["Support","Fiddlesticks",	113	],
	// 		["Top","Aatrox",	97	],
	// 		["Top","Akali",	169	],
	// 		["Top","Cassiopeia",	185	],
	// 		["Top","Cho'Gath",	82	],
	// 		["Top","Darius",	22	],
	// 		["Top","Dr. Mundo",	158	],
	// 		["Top","Ekko",	145	],
	// 		["Top","Fiora",	41	],
	// 		["Top","Fizz",	178	],
	// 		["Top","Galio",	90	],
	// 		["Top","Gangplank",	1	],
	// 		["Top","Garen",	6	],
	// 		["Top","Gnar",	100	],
	// 		["Top","Hecarim",	49	],
	// 		["Top","Irelia",	19	],
	// 		["Top","Jarvan IV",	104	],
	// 		["Top","Jax",	142	],
	// 		["Top","Jayce",	118	],
	// 		["Top","Karthus",	95	],
	// 		["Top","Kassadin",	186	],
	// 		["Top","Kayle",	120	],
	// 		["Top","Kennen",	133	],
	// 		["Top","Lissandra",	123	],
	// 		["Top","Lulu",	183	],
	// 		["Top","Malphite",	70	],
	// 		["Top","Maokai",	180	],
	// 		["Top","Nasus",	80	],
	// 		["Top","Olaf",	129	],
	// 		["Top","Pantheon",	112	],
	// 		["Top","Poppy",	176	],
	// 		["Top","Quinn",	171	],
	// 		["Top","Renekton",	14	],
	// 		["Top","Rengar",	57	],
	// 		["Top","Riven",	28	],
	// 		["Top","Rumble",	164	],
	// 		["Top","Ryze",	184	],
	// 		["Top","Shen",	140	],
	// 		["Top","Shyvana",	152	],
	// 		["Top","Singed",	74	],
	// 		["Top","Sion",	179	],
	// 		["Top","Swain",	147	],
	// 		["Top","Tahm Kench",	111	],
	// 		["Top","Teemo",	135	],
	// 		["Top","Trundle",	155	],
	// 		["Top","Tryndamere",	61	],
	// 		["Top","Urgot",	187	],
	// 		["Top","Vladimir",	54	],
	// 		["Top","Volibear",	167	],
	// 		["Top","Wukong",	32	],
	// 		["Top","Yasuo",	37	],
	// 		["Top","Yorick",	182	],
	// 		["Top","Zac",	161	],
	// 		["Top","Heimerdinger",	126	],
	// 		["Top","Mordekaiser",	181	]
    // ];

	var championPatch = [
		//Duelists
		["Duelist", "Jett", 1],
		["Duelist", "Raze", 2],
		["Duelist", "Chamber", 10],
		["Duelist", "Reyna", 17],
		["Duelist", "Pheonix", 18],
		
		//Sentinals
		["Sentinal", "Cypher", 3],
		["Sentinal", "Killjoy", 4],
		["Sentinal", "Chamber", 5],
		["Sentinal", "Sage", 8],
		["Sentinal", "Deadlock", 20],

		//Initiator
		["Initiator", "Skye", 6],
		["Initiator", "Kayo", 7],
		["Initiator", "Breach", 9],
		["Initiator", "Raze", 13],
		["Initiator", "Killjoy", 14],
		["Initiator", "Sage", 16],
		["Initiator", "Pheonix", 19],

		//Smokes
		["Smokes", "Brimestone", 11],
		["Smokes", "Viper", 12],
		["Smokes", "Astra", 15],
		["Smokes", "Omen", 21],
	]

    return {
        championPatch: championPatch
    };
});