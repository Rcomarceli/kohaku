import React, { Component, useContext, useEffect, useState, useMemo, useRef } from 'react';
import loadingGif from './kohaku_loading.gif';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

function Root() {
    return (
        <div className='loading-container'>
            <img src={loadingGif} alt="loading..." />
        </div>
    );
};

export default Root