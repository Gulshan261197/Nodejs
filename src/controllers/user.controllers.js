import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"



const generateAccessTokenAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //refresh token ko object k andar dala hai for user authentication
        user.refreshToken = refreshToken
        //value dalne k bad save in database
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new apiError(500, "something went wrong while generating referesh and access token")
    }
}


//User Register

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation -- not empty 
    //check if user already exists=> username,email
    //check for images , check for avtar
    //upload them to cloudinary , avtar
    //create user object -- create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response


    const { fullname, email, username, password } = req.body

    if (
        [fullname, email, password, username].some((field) =>
            field?.trim() === "")

    ) {
        throw new apiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new apiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is reuired")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password  -refreshToken"
    )
    if (!createdUser) {
        throw new apiError(500, "something went wrong while registering the user ")
    }


    return res.status(201).json(
        new apiResponse(200, createdUser, "User Registered Succesfully")
    )

})


//User Login
const loginUser = asyncHandler(async (req, res) => {
    //req body =>data
    //username or email =>not empty
    //find the user
    //check user exist or not
    //password check
    //access and refresh token
    //send cookie
    const { email, username, password } = req.body

    if (!(username || email)) {
        throw new apiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]//$or => mongodb operator hai
    })

    if (!user) {
        throw new apiError(404, "User does not exist")
    }

    //User.find se aap ise access nhi kr skte because ye mongoose k method hai
    //isliye khud k create method jo hai aapke user me available hai jo databse se instance liya hai '(user)' 
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new apiError(401, "Invalid Password")
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshTokens(user._id)


    //user ko kya nhi bhejna hai
    const loggedInUser = await User.findById(user._id).select("-password  -refreshtoken")

    //send cookies
    const option = {
        //httpOnly , secure, ko true krne se ye server side se midifie ho skta hai frontend se nhi
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new apiResponse(200,
                {
                    user: loggedInUser, accessToken, refreshToken
                }, "User Logged In successfully")
        )


})

//Logout User
const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id, {
        $set: {
            refreshToken: undefined
        }
    },
        {
            new: true
        }

    )

    const option = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(
            new apiResponse(200, {}, "User Logged Out")
        )

})


//refreshAcessToken
const refreshAcessToken=asyncHandler(async(req,res)=>{
  const incomingRefreshToken=  req.cookie.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new apiError(401,"unauthroized request")
  }

try {
    const decodedToken=jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
    const user= await User.findById(decodedToken?._id)
    
    
    if(!user){
        throw new apiError(401,"Invalid Refresh Token")
      }
    
     if(incomingRefreshToken!==user?.refreshToken){
            throw new apiError(401,"Referesh token is expired or used")
     }
    
    const {newRefreshToken,accessToken}=await generateAccessTokenAndRefreshTokens(user._id)
    
    const option={
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken",accessToken, option)
    .cookie("refreshToken",newRefreshToken, option)
    .json(
        new apiResponse(
            200,
            {accessToken,refreshToken:newRefreshToken},
            "Access Token Refreshed"
        )
    )
    
    
    
} catch (error) {
    throw new apiError(401,error?.message || "Invalid refresh token")
    
}
})



export { registerUser, loginUser, logoutUser,refreshAcessToken }