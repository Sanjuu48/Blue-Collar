import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "../components/Navabar";
import Hero from "../components/Hero";
import AiTools from "../components/AiTools";
import Testimonials from "../components/Testimonial";
import Plan from "../components/Plan";
import Footer from "../components/Footer";

const Home=()=>{
    return(
        <>
        <Navbar/>
        <Hero/>
        <AiTools/>
        <Testimonials/>
        <Plan/>
        <Footer/>
        </>
    )
}

export default Home