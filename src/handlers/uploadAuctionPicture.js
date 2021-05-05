import {getAuctionById} from './getAuction' ;
import {uploadPictureToS3} from '../lib/uploadPictureToS3';
import middy from '@middy/core' ;
import httpErrorHandler from '@middy/http-error-handler' ;
import createHttpError from 'http-errors';
import {setAuctionPictureUrl} from '../lib/setAuctionPicture' ;
import validator from '@middy/validator' ;
import uploadAuctionPictureSchema from '../lib/schemas/uploadAuctionPictureSchema' ;



export async function uploadAuctionPicture(event) {

    const { id } = event.pathParameters ;

    const { amount } = event.body ;
    const { email } = event.requestContext.authorizer ;

    const auction = await getAuctionById(id) ;
    const base64 = event.body.replace(/^data:image\/\w+;base64,/, ''); ;
    const buffer = Buffer.from(base64, 'base64') ;

    // you cannot bid on your own auctions
    if (auction.seller  !== email)
    {
        throw new createHttpError.Forbidden(`You are not the owner of this auction. Only owners can upload pictures for their auction!`) ;
    }

    console.log (`Email: ${email} and Seller: ${auction.seller}.`) ;

    let updatedAuction ; 

    try {
        const pictureUrl = await uploadPictureToS3(auction.id + '.jpg', buffer ) ;
        // picture Url to DynaoDb
        updatedAuction = await setAuctionPictureUrl(id, pictureUrl) ;

        console.log(updatedAuction) ;
    }
    catch(error) {
        console.log(error) ;
        throw createHttpError.InternalServerError(error) ;
    }

    return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
    };
}

export const handler = middy(uploadAuctionPicture)
                        .use(httpErrorHandler())
                        .use(validator({inputSchema: uploadAuctionPictureSchema })) ;
                        