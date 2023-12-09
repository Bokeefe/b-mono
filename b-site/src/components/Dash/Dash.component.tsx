import { Routes, Route } from 'react-router-dom';
import './Dash.scss';
import Resume from '../../domains/Resume/Resume.component';

function Dash() {

 return (
 <div className='dash'>
   <Routes>
       <Route path="/resume" element={<Resume />} />
      
     </Routes>
 </div>
 )
}

export default Dash
