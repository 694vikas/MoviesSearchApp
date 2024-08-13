 async function search(){

    let userInput=document.querySelector('#data-search').value;
    let apiKey='83019b05';
    let dispalyData=document.querySelector('.display-data');
    let dataposter=document.querySelector('#movies-poster');
    let moviesData=document.querySelector('.movies-data');
    if(userInput==""){
        alert('Enter a movie name');
        return;
    }
    try{
    let response=await fetch(`https://www.omdbapi.com/?t=${userInput}&apikey=${apiKey}`)
    let data = await response.json();
    // movies details
    // let title=data.Title;
    // let year=data.Released;
    // let director=data.Director;
    // let actors=data.Actors;
    // let plot=data.Plot;
    // let award=data.Awards;
    // let rating=data.imdbRating;
    dataposter.src = data.Poster;
    moviesData.innerHTML=`<h1>${data.Title}</h1>
    <p><strong>Year:</strong> ${data.Released}</p>
    <p><strong>Director:</strong> ${data.Director}</p>
    <p><strong>Actors:</strong> ${data.Actors}</p>
    <p><strong>Plot:</strong> ${data.Plot}</p>
    <p><strong>Awards:</strong> ${data.Awards}</p>
    <p><strong>IMDb Rating:</strong> ${data.imdbRating}</p>
  `;}
  catch(error){
    console.log('Error:',error.message);
  }

    
  
   

 }