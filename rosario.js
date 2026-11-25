// Rosario: texto tal cual lo dio Guillem. Los misterios de cada día de la semana.
export const MISTERIOS = [
  { id: "gozosos", nombre: "Gozosos", dias: "Lunes y sábado", lista: [
    "La encarnación del hijo de Dios",
    "La Visitación de Nuestra Señora a su prima Santa Isabel",
    "El Nacimiento del Hijo de Dios en el portal de Belén",
    "La presentación de Jesús en el Templo",
    "El Niño Jesús perdido y hallado en el Templo",
  ] },
  { id: "dolorosos", nombre: "Dolorosos", dias: "Martes y viernes", lista: [
    "La oración en el Huerto",
    "La flagelación de Jesús atado a la columna",
    "La coronación de espinas",
    "Jesús con la Cruz a cuestas camino del Calvario",
    "La crucifixión y muerte de Jesús",
  ] },
  { id: "gloriosos", nombre: "Gloriosos", dias: "Miércoles y domingo", lista: [
    "La resurrección del Hijo de Dios",
    "La Ascensión del Señor al cielo",
    "La venida del Espíritu Santo",
    "La Asunción de María al cielo",
    "La coronación de María como Reina y Señora de todo lo creado",
  ] },
  { id: "luminosos", nombre: "Luminosos", dias: "Jueves", lista: [
    "El Bautismo en el Jordán",
    "Las bodas de Caná",
    "El anuncio del Reino de Dios",
    "La Transfiguración",
    "La institución de la Eucaristía",
  ] },
];

// 0 = domingo … 6 = sábado
const POR_DIA = ["gloriosos", "gozosos", "dolorosos", "gloriosos", "luminosos", "dolorosos", "gozosos"];
export const misteriosDe = (fecha) => POR_DIA[fecha.getDay()];

// En orden. La sección con misterios: true lleva los 5 misterios elegidos.
export const ORACIONES = [
  { titulo: "", texto: "Por la señal de la Santa Cruz, de nuestros enemigos líbranos Señor Dios nuestro.\nEn el nombre del Padre, del Hijo, y del Espíritu Santo.\nAmén." },
  { titulo: "", texto: "℣. Dios mío, ven en mi auxilio.\n℟. Señor, date prisa en socorrerme.\n℣. Gloria al Padre, y al Hijo, y al Espíritu Santo.\n℟. Como era en el principio ahora y siempre por los siglos de los siglos. Amén." },
  { titulo: "ACTO DE CONTRICIÓN", texto: "¡Señor mío, Jesucristo!\nDios y Hombre verdadero,\nCreador, Padre y Redentor mío; por ser Vos quien sois, Bondad infinita, y porque os amo sobre todas las cosas, me pesa de todo corazón de haberos ofendido;\ntambién me pesa porque podéis castigarme con las penas del infierno.\nAyudado de vuestra divina gracia propongo firmemente nunca más pecar, confesarme y cumplir la penitencia que me fuere impuesta. Amén." },
  { titulo: "CREDO", texto: "Creo en Dios, Padre Todopoderoso,\nCreador del cielo y de la tierra.\nCreo en Jesucristo, su único Hijo, Nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato fue crucificado, muerto y sepultado, descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los cielos\ny está sentado a la derecha de Dios, Padre todopoderoso.\nDesde allí ha de venir a juzgar a vivos y muertos.\nCreo en el Espíritu Santo, la Santa Iglesia Católica, la comunión de los santos, el perdón de los pecados, la resurrección de la carne y la vida eterna. Amén." },
  { titulo: "QUEREMOS SER DE LOS TUYOS", texto: "Corazón de Jesús,\nqueremos ser de los tuyos. De los tuyos de veras.\nLos que no se retrocedan, los que no se desalienten, los que no conozcan las medias tintas ni las posturas ambiguas, los que lo den todo antes que traicionarte.\nPor eso te pedimos que nos enseñes, que nos formes, que nos venzas, que nos enciendas en santa violencia y en afanes de conquista.\nHaznos apóstoles de tu Reino, luchadores de tu Santa Iglesia.\nPara recorrer el mundo siempre a tu servicio,\ncon la sola ilusión de que Tu reines, de que Tú seas más amado, de que Tú seas más conocido.\nNuestra Señora de los valientes, nuestra Señora de los humildes, encarna de nuevo a Cristo en nuestra pobre vida.\nAmén." },
  { titulo: "5 MISTERIOS", texto: "Padre nuestro, 10 Ave Marías, Gloria.", misterios: true },
  { titulo: "DESPUÉS DE CADA MISTERIO", texto: "Oh Jesús mío, perdona nuestros pecados, líbranos del fuego del infierno, lleva a todas las almas al cielo y socorre principalmentea las más necesitadas de tu misericordia.\nDios mío yo creo, adoro, espero y te amo. Te pido perdón por los que no creen, no adoran, no esperan y no te aman." },
  { titulo: "PETICIONES POR EL PAPA", texto: "Padre nuestro, Ave María, Gloria." },
  { titulo: "ORACIÓN PARA SENTIR CON LA IGLESIA", texto: "Señor Jesús,\nsi de tu Corazón herido brotó como Esposa tuya muy querida\nnuestra Madre Iglesia,\nUna, Santa, Católica y Apostólica.\nDame un mismo entender, querer y sentir con ella, sobre todo en materias que rocen con el dogma y la moral.\nAme y obedezca con pasión al Papa, tu Vicario, y una obediencia también rendida a los sucesores de tus apóstoles nuestros obispos.\nHijo fiel de tu Iglesia hasta la muerte, su doctrina me ilumine, sus glorias me honren, sus persecuciones me aflijan, sus fallas me estimulen. Por ella ore, por ella trabaje, por ella sucumba, así sea." },
  { titulo: "SALVE", texto: "Dios te salve, Reina y Madre de misericordia,\nvida, dulzura y esperanza nuestra: Dios te salve.\nA ti llamamos los desterrados hijos de Eva;\na ti suspiramos, gimiendo y llorando\nen este valle de lágrimas.\nEa, pues, Señora abogada nuestra,\nvuelve a nosotros esos tus ojos misericordiosos\ny, después de este destierro, muéstranos a Jesús,\nfruto bendito de tu vientre.\n¡Oh clementísima, oh piadosa,\noh dulce Virgen María!\nRuega por nosotros, Santa Madre de Dios\npara que seamos dignos de alcanzar las promesas\nde Nuestro Señor Jesucristo. Amén." },
];
