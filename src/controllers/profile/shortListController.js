import mongoose from 'mongoose';
import UserModel from '../../models/user.model.js';
import  {socket}  from '../../app.js';
import { createNotification } from '../notification/notificationController.js';
// Shortlist a Profile
export const shortlistProfile = async (req, res) => {
  try {
    const userId = req.user._id; // The ID of the logged-in user
    const { profileId } = req.params; // The ID of the profile to be shortlisted
    console.log(`profileId:: ${profileId}`)

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile ID',
      });
    }

    // Find the logged-in user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if the profile is already shortlisted
    const isAlreadyShortlisted = user.shortlistedProfiles.includes(profileId);
    if (isAlreadyShortlisted) {
      return res.status(400).json({
        success: false,
        message: 'Profile is already shortlisted',
      });
    }

    // Find the profile to be shortlisted
    const profileToBeShortlisted = await UserModel.findById(profileId);
    if (!profileToBeShortlisted) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Add the profileId to the logged-in user's shortlistedProfiles array
    user.shortlistedProfiles.push(profileId);

    // Add the userId to the profile's shortListedBy array
    profileToBeShortlisted.shortListedBy.push(userId);

    // Save both updated documents
    await user.save();
    await profileToBeShortlisted.save();
    
        //create notification
        createNotification("shortlist", userId, profileId)

     // Emit notification to the receiver through standalone Socket.IO server
     socket.emit('newNotification', {
      type: 'shortlist',
      sender: userId,
      receiver: profileId,
     
    });

    res.status(200).json({
      success: true,
      message: 'Profile shortlisted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Remove a Shortlisted Profile
export const removeShortlistedProfile = async (req, res) => {
  try {
    const { profileId } = req.params; // The ID of the profile to be removed from the shortlist
    const userId = req.user._id; // The ID of the logged-in user

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ success: false, message: 'Invalid profile ID' });
    }

    // Fetch both the user and the profile to be removed from the shortlist
    const [user, profileToBeRemoved] = await Promise.all([
      UserModel.findById(userId),
      UserModel.findById(profileId)
    ]);

    if (!user || !profileToBeRemoved) {
      return res.status(404).json({ success: false, message: 'User or profile not found' });
    }

    // Remove the profileId from the user's shortlistedProfiles array
    user.shortlistedProfiles = user.shortlistedProfiles.filter(id => id.toString() !== profileId.toString());

    // Remove the userId from the profile's shortListedBy array
    profileToBeRemoved.shortListedBy = profileToBeRemoved.shortListedBy.filter(id => id.toString() !== userId.toString());

    // Save both updated documents
    await Promise.all([user.save(), profileToBeRemoved.save()]);

    res.status(200).json({ success: true, message: 'Shortlisted profile removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
